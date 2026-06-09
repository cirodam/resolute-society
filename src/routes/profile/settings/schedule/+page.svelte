<script lang="ts">
	import { formatDateTime } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function humanizeName(jobName: string): string {
		return jobName
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	function isLocked(lockUntil: string | null): boolean {
		return !!lockUntil && new Date(lockUntil) > new Date();
	}
</script>

<div class="schedule-content">
	{#if data.jobs.length === 0}
		<div class="empty-state card-border">
			<p>No scheduled jobs have run yet.</p>
		</div>
	{:else}
		<div class="jobs-table card-border">
			<div class="jobs-header">
				<div>Job</div>
				<div>Last Run</div>
				<div>Last Success</div>
				<div>Status</div>
			</div>

			{#each data.jobs as job}
				<div class="jobs-row" class:jobs-row--error={!!job.last_error_at && !job.last_success_at || (job.last_error_at && job.last_success_at && job.last_error_at > job.last_success_at)}>
					<div class="job-name">
						<span class="job-label">{humanizeName(job.job_name)}</span>
						<span class="job-key t-label">{job.job_name}</span>
					</div>

					<div class="job-time">
						{job.last_started_at ? formatDateTime(job.last_started_at) : '—'}
					</div>

					<div class="job-time">
						{job.last_success_at ? formatDateTime(job.last_success_at) : '—'}
					</div>

					<div class="job-status">
						{#if isLocked(job.lock_until)}
							<span class="badge badge--running">Running</span>
						{:else if job.last_error_at && (!job.last_success_at || job.last_error_at > job.last_success_at)}
							<span class="badge badge--error">Error</span>
						{:else if job.last_success_at}
							<span class="badge badge--ok">OK</span>
						{:else}
							<span class="badge badge--pending">Pending</span>
						{/if}
					</div>
				</div>

				{#if job.last_error_message && job.last_error_at && (!job.last_success_at || job.last_error_at > job.last_success_at)}
					<div class="error-detail">
						<span class="error-label t-label">Last error</span>
						<span class="error-text">{job.last_error_message}</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.schedule-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.jobs-table {
		overflow-x: auto;
	}

	.jobs-header,
	.jobs-row {
		display: grid;
		grid-template-columns: 1fr 180px 180px 100px;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-5);
		align-items: center;
	}

	.jobs-header {
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.jobs-row {
		border-bottom: 1px solid var(--border-faint);
	}

	.jobs-row:last-of-type {
		border-bottom: none;
	}

	.jobs-row--error {
		background: color-mix(in srgb, var(--color-danger, #c0392b) 4%, transparent);
	}

	.job-name {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.job-label {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink);
	}

	.job-key {
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		color: var(--ink-faint);
	}

	.job-time {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.badge {
		display: inline-block;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		padding: 0.2em 0.6em;
		border-radius: 2px;
	}

	.badge--ok       { background: var(--surface-dk); color: var(--ink-mid); }
	.badge--running  { background: var(--accent-faint, #e8e0d0); color: var(--ink); }
	.badge--error    { background: color-mix(in srgb, var(--color-danger, #c0392b) 15%, transparent); color: var(--color-danger, #c0392b); }
	.badge--pending  { color: var(--ink-faint); }

	.error-detail {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
		padding: var(--space-2) var(--space-5) var(--space-3);
		border-bottom: 1px solid var(--border-faint);
		background: color-mix(in srgb, var(--color-danger, #c0392b) 4%, transparent);
	}

	.error-label {
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		color: var(--color-danger, #c0392b);
		white-space: nowrap;
	}

	.error-text {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.empty-state {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}
</style>
