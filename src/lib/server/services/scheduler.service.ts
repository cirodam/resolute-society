import { db } from '$lib/server/infra/db';
import { getRepositories } from '$lib/server/infra/repositories';
import { reconcileEndowmentMint } from '$lib/server/economy/reconciliation';

const ENDOWMENT_RECONCILE_JOB = 'endowment_reconcile_daily_0800';
const LOCK_LEASE_SECONDS = 5 * 60;
const TICK_MS = 60_000;

let schedulerStarted = false;

type JobStateRow = {
	job_name: string;
	last_success_at: string | null;
};

function toSqlDateTime(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function scheduledAnchorForToday(now: Date): Date {
	const anchor = new Date(now);
	anchor.setHours(8, 0, 0, 0);
	return anchor;
}

function requiredRunAnchor(now: Date): Date {
	const todayAnchor = scheduledAnchorForToday(now);
	if (now >= todayAnchor) return todayAnchor;
	const yesterdayAnchor = new Date(todayAnchor);
	yesterdayAnchor.setDate(yesterdayAnchor.getDate() - 1);
	return yesterdayAnchor;
}

function ensureJobState(jobName: string): void {
	db()
		.prepare(
			`INSERT OR IGNORE INTO scheduled_job_state (job_name)
			 VALUES (?)`
		)
		.run(jobName);
}

function isJobDue(jobName: string, now: Date): boolean {
	ensureJobState(jobName);
	const row = db()
		.prepare('SELECT job_name, last_success_at FROM scheduled_job_state WHERE job_name = ?')
		.get(jobName) as JobStateRow | undefined;

	if (!row?.last_success_at) return true;

	const anchor = requiredRunAnchor(now);
	return row.last_success_at < toSqlDateTime(anchor);
}

function acquireLease(jobName: string, now: Date): boolean {
	ensureJobState(jobName);
	const nowSql = toSqlDateTime(now);
	const lockUntil = new Date(now.getTime() + LOCK_LEASE_SECONDS * 1000);
	const lockUntilSql = toSqlDateTime(lockUntil);

	const result = db()
		.prepare(
			`UPDATE scheduled_job_state
			 SET last_started_at = ?, lock_until = ?, updated_at = datetime('now')
			 WHERE job_name = ?
			   AND (lock_until IS NULL OR lock_until <= ?)`
		)
		.run(nowSql, lockUntilSql, jobName, nowSql);

	return result.changes === 1;
}

function markSuccess(jobName: string): void {
	db()
		.prepare(
			`UPDATE scheduled_job_state
			 SET last_success_at = datetime('now'),
			     last_error_at = NULL,
			     last_error_message = NULL,
			     lock_until = NULL,
			     updated_at = datetime('now')
			 WHERE job_name = ?`
		)
		.run(jobName);
}

function markFailure(jobName: string, errorMessage: string): void {
	db()
		.prepare(
			`UPDATE scheduled_job_state
			 SET last_error_at = datetime('now'),
			     last_error_message = ?,
			     lock_until = NULL,
			     updated_at = datetime('now')
			 WHERE job_name = ?`
		)
		.run(errorMessage.slice(0, 500), jobName);
}

function runEndowmentReconcileJob(): void {
	const repositories = getRepositories();
	const societies = repositories.societies.listAll();

	for (const society of societies) {
		reconcileEndowmentMint(society.id);
	}
}

function runDueJobs(): void {
	const now = new Date();
	const jobName = ENDOWMENT_RECONCILE_JOB;

	if (!isJobDue(jobName, now)) return;
	if (!acquireLease(jobName, now)) return;

	try {
		runEndowmentReconcileJob();
		markSuccess(jobName);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown scheduler error';
		markFailure(jobName, message);
		console.warn(`[scheduler] ${jobName} failed: ${message}`);
	}
}

export function startScheduler(): void {
	if (schedulerStarted) return;
	schedulerStarted = true;

	runDueJobs();
	setInterval(runDueJobs, TICK_MS);
}