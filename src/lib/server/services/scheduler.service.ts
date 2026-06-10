import { db } from '$lib/server/infra/db';
import { getRepositories } from '$lib/server/infra/repositories';
import { reconcileEndowmentMint } from '$lib/server/economy/reconciliation';

const ENDOWMENT_RECONCILE_JOB = 'endowment_reconcile_daily_0800';
const LEDGER_PRUNE_JOB = 'ledger_prune_daily_0800';
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

export function requiredRunAnchor(now: Date): Date {
	const todayAnchor = scheduledAnchorForToday(now);
	if (now >= todayAnchor) return todayAnchor;
	const yesterdayAnchor = new Date(todayAnchor);
	yesterdayAnchor.setDate(yesterdayAnchor.getDate() - 1);
	return yesterdayAnchor;
}

async function ensureJobState(jobName: string): Promise<void> {
	await db()`
		INSERT INTO scheduled_job_state (job_name)
		VALUES (${jobName})
		ON CONFLICT DO NOTHING`;
}

async function isJobDue(jobName: string, now: Date): Promise<boolean> {
	await ensureJobState(jobName);
	const [row] = await db()<JobStateRow[]>`
		SELECT job_name, last_success_at FROM scheduled_job_state WHERE job_name = ${jobName}`;

	if (!row?.last_success_at) return true;

	const anchor = requiredRunAnchor(now);
	return row.last_success_at < toSqlDateTime(anchor);
}

async function acquireLease(jobName: string, now: Date): Promise<boolean> {
	await ensureJobState(jobName);
	const nowSql = toSqlDateTime(now);
	const lockUntil = new Date(now.getTime() + LOCK_LEASE_SECONDS * 1000);
	const lockUntilSql = toSqlDateTime(lockUntil);

	const result = await db()`
		UPDATE scheduled_job_state
		SET last_started_at = ${nowSql}, lock_until = ${lockUntilSql}, updated_at = NOW()
		WHERE job_name = ${jobName}
		  AND (lock_until IS NULL OR lock_until <= ${nowSql})`;

	return result.count === 1;
}

async function markSuccess(jobName: string): Promise<void> {
	await db()`
		UPDATE scheduled_job_state
		SET last_success_at = NOW(),
		    last_error_at = NULL,
		    last_error_message = NULL,
		    lock_until = NULL,
		    updated_at = NOW()
		WHERE job_name = ${jobName}`;
}

async function markFailure(jobName: string, errorMessage: string): Promise<void> {
	await db()`
		UPDATE scheduled_job_state
		SET last_error_at = NOW(),
		    last_error_message = ${errorMessage.slice(0, 500)},
		    lock_until = NULL,
		    updated_at = NOW()
		WHERE job_name = ${jobName}`;
}

async function runEndowmentReconcileJob(): Promise<void> {
	const repositories = getRepositories();
	const societies = await repositories.societies.listAll();

	for (const society of societies) {
		await reconcileEndowmentMint(society.id);
	}
}

async function runLedgerPruneJob(): Promise<void> {
	await getRepositories().ledger.pruneLedger();
}

const JOBS: Array<{ name: string; run: () => Promise<void> }> = [
	{ name: ENDOWMENT_RECONCILE_JOB, run: runEndowmentReconcileJob },
	{ name: LEDGER_PRUNE_JOB, run: runLedgerPruneJob },
];

async function runDueJobs(): Promise<void> {
	const now = new Date();
	for (const job of JOBS) {
		if (!(await isJobDue(job.name, now))) continue;
		if (!(await acquireLease(job.name, now))) continue;
		try {
			await job.run();
			await markSuccess(job.name);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown scheduler error';
			await markFailure(job.name, message);
			console.warn(`[scheduler] ${job.name} failed: ${message}`);
		}
	}
}

export function startScheduler(): void {
	if (schedulerStarted) return;
	schedulerStarted = true;

	runDueJobs().catch((err) => console.warn('[scheduler] initial run failed:', (err as Error).message));
	setInterval(() => {
		runDueJobs().catch((err) => console.warn('[scheduler] tick failed:', (err as Error).message));
	}, TICK_MS);
}
