<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
	const messages = $derived(data.messages);
	const summary = $derived(data.summary);

	function formatTimestamp(ts: string | null): string {
		if (!ts) return '—';
		return new Date(ts + 'Z').toLocaleString();
	}

	function payloadSummary(type: string, payload: Record<string, unknown>): string {
		if (type === 'person_joined') {
			return `@${payload.personHandle} age ${payload.age}`;
		}
		return JSON.stringify(payload);
	}
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Federation Messages</h1>
		<p class="page-header-description">Outbound message queue for {society.name}</p>
	</div>

	<div class="identity-section card-border">
		<div class="identity-header">
			<div>
				<div class="t-label" style="margin-bottom: var(--space-1);">Society Public Key</div>
				<code class="public-key">{data.publicKey ?? 'Generating…'}</code>
			</div>
		</div>

		{#if form?.joinQueued}
			<div class="success-message">Join message queued — delivery will be attempted shortly.</div>
		{/if}
		{#if form?.joinError}
			<div class="error-message">{form.joinError}</div>
		{/if}

		<form method="POST" action="?/join" use:enhance class="join-form">
			<div class="join-fields">
				<div class="input-group">
					<label for="secret" class="t-label">Invite Token</label>
					<input
						id="secret"
						name="secret"
						type="text"
						placeholder="Paste the invite token from the federation admin"
						required
						class="secret-input"
					/>
				</div>
				<button type="submit" class="btn btn--primary">Request Admission</button>
			</div>
		</form>
	</div>

	<div class="summary-grid">
		<div class="summary-card card-border">
			<div class="summary-label t-label">Total</div>
			<div class="summary-value t-numeric">{summary.total}</div>
		</div>
		<div class="summary-card card-border status-delivered">
			<div class="summary-label t-label">Delivered</div>
			<div class="summary-value t-numeric">{summary.delivered}</div>
		</div>
		<div class="summary-card card-border status-pending">
			<div class="summary-label t-label">Pending</div>
			<div class="summary-value t-numeric">{summary.pending}</div>
		</div>
		<div class="summary-card card-border status-stalled">
			<div class="summary-label t-label">Stalled</div>
			<div class="summary-value t-numeric">{summary.stalled}</div>
		</div>
	</div>

	{#if messages.length === 0}
		<p class="empty-state">No federation messages yet.</p>
	{:else}
		<div class="messages-table-wrapper card-border">
			<table class="messages-table">
				<thead>
					<tr>
						<th>Type</th>
						<th>Details</th>
						<th>Status</th>
						<th>Attempts</th>
						<th>Created</th>
						<th>Last Attempted</th>
						<th>Delivered</th>
					</tr>
				</thead>
				<tbody>
					{#each messages as message}
						<tr>
							<td class="col-type"><span class="type-badge">{message.type}</span></td>
							<td class="col-details">{payloadSummary(message.type, message.payload)}</td>
							<td class="col-status">
								<span class="status-badge status-badge--{message.status}">{message.status}</span>
							</td>
							<td class="col-attempts t-numeric">{message.attemptCount}</td>
							<td class="col-time">{formatTimestamp(message.createdAt)}</td>
							<td class="col-time">{formatTimestamp(message.lastAttemptedAt)}</td>
							<td class="col-time">{formatTimestamp(message.deliveredAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.summary-card {
		padding: var(--space-5);
		text-align: center;
	}

	.summary-label {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin-bottom: var(--space-2);
		text-transform: lowercase;
	}

	.summary-value {
		font-size: var(--text-3xl);
		color: var(--ink);
	}

	.status-delivered .summary-value { color: var(--accent); }
	.status-pending .summary-value   { color: var(--gold); }
	.status-stalled .summary-value   { color: var(--danger); }

	.messages-table-wrapper {
		overflow-x: auto;
	}

	.messages-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.messages-table th {
		padding: var(--space-3) var(--space-4);
		text-align: left;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-mid);
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.messages-table td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-faint);
		vertical-align: middle;
	}

	.messages-table tr:last-child td {
		border-bottom: none;
	}

	.type-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		color: var(--ink-mid);
	}

	.col-details {
		color: var(--ink);
	}

	.col-attempts {
		text-align: right;
		color: var(--ink-mid);
	}

	.col-time {
		color: var(--ink-faint);
		white-space: nowrap;
		font-size: var(--text-xs);
	}

	.status-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.status-badge--delivered {
		background: var(--accent-lt);
		color: var(--accent);
	}

	.status-badge--pending {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.status-badge--stalled {
		background: var(--danger-lt);
		color: var(--danger);
	}

	.identity-section {
		padding: var(--space-5);
		margin-bottom: var(--space-8);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.identity-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}

	.public-key {
		display: block;
		font-family: monospace;
		font-size: var(--text-xs);
		color: var(--ink-mid);
		word-break: break-all;
		margin-top: var(--space-2);
	}

	.join-form {
		border-top: 1px solid var(--border-faint);
		padding-top: var(--space-5);
	}

	.join-fields {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);
	}

	.join-fields .input-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.secret-input {
		padding: var(--space-3);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: monospace;
		font-size: var(--text-sm);
		width: 100%;
	}

	.secret-input:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	/* success/error-message have padding: space-3 space-4 here (different from global space-3 alone) */
	.success-message {
		padding: var(--space-3) var(--space-4);
		margin-bottom: 0;
	}

	.error-message {
		padding: var(--space-3) var(--space-4);
		margin-bottom: 0;
	}
</style>
