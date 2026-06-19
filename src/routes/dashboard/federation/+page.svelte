<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
	const messages = $derived(data.messages);
	const summary = $derived(data.summary);
	const peerSocieties = $derived(data.peerSocieties);

	let activeTab = $state('Messages');

	const tabs = [
		{ label: 'Messages' },
		{ label: 'Peer Societies' }
	];

	function formatTimestamp(ts: string | null | Date): string {
		if (!ts) return '—';
		const d = typeof ts === 'string' ? new Date(ts + 'Z') : ts;
		return d.toLocaleString();
	}

	function payloadSummary(_type: string, payload: Record<string, unknown>): string {
		return JSON.stringify(payload);
	}

	const STANDING_LABEL: Record<string, string> = {
		forming: 'Forming',
		good_standing: 'Good Standing',
		suspended: 'Suspended',
		defunct: 'Defunct'
	};
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Federation</h1>
		<p class="page-header-description">{society.name}</p>
	</div>

	<div class="identity-section card-border">
		<div class="identity-header">
			<div>
				<div class="t-label" style="margin-bottom: var(--space-1);">Society Public Key</div>
				<code class="public-key">{data.publicKey ?? 'Generating…'}</code>
			</div>
		</div>

		<Alert type="success" message={form?.joinQueued ? 'Join message queued — delivery will be attempted shortly.' : null} />
		<Alert type="error" message={form?.joinError} />

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

	<Subnav {tabs} {activeTab} onTabClick={(label) => (activeTab = label)} />

	{#if activeTab === 'Messages'}
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
			<EmptyState message="No federation messages yet." />
		{:else}
			<div class="table-wrapper card-border">
				<table class="data-table">
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
								<td><span class="type-badge">{message.type}</span></td>
								<td class="col-details">{payloadSummary(message.type, message.payload)}</td>
								<td>
									<span class="status-badge status-badge--{message.status}">{message.status}</span>
								</td>
								<td class="col-numeric t-numeric">{message.attemptCount}</td>
								<td class="col-time">{formatTimestamp(message.createdAt)}</td>
								<td class="col-time">{formatTimestamp(message.lastAttemptedAt)}</td>
								<td class="col-time">{formatTimestamp(message.deliveredAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'Peer Societies'}
		<div class="peers-header">
			<form method="POST" action="?/syncPeers" use:enhance class="sync-form">
				<Alert type="success" message={form?.syncedCount != null ? `Synced ${form.syncedCount} societies from federation.` : null} />
				<Alert type="error" message={form?.syncError} />
				<button type="submit" class="btn btn--secondary btn--sm">Sync Now</button>
			</form>
		</div>

		{#if peerSocieties.length === 0}
			<EmptyState message="No peer societies synced yet. Use Sync Now to fetch them from the federation." />
		{:else}
			<div class="table-wrapper card-border">
				<table class="data-table">
					<thead>
						<tr>
							<th>Handle</th>
							<th>Name</th>
							<th>Address</th>
							<th>Members</th>
							<th>Standing</th>
							<th>Last Synced</th>
						</tr>
					</thead>
					<tbody>
						{#each peerSocieties as peer}
							<tr>
								<td class="col-handle">@{peer.handle}</td>
								<td class="col-name">{peer.name}</td>
								<td class="col-address">{peer.address ?? '—'}</td>
								<td class="col-numeric t-numeric">{peer.member_count}</td>
								<td>
									<span class="standing-badge standing-badge--{peer.standing}">
										{STANDING_LABEL[peer.standing] ?? peer.standing}
									</span>
								</td>
								<td class="col-time">{formatTimestamp(peer.synced_at)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>

<style>
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

	/* Messages tab */
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

	/* Peer societies tab */
	.peers-header {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--space-4);
	}

	.sync-form {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	/* Shared table styles */
	.table-wrapper {
		overflow-x: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.data-table th {
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

	.data-table td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-faint);
		vertical-align: middle;
	}

	.data-table tr:last-child td {
		border-bottom: none;
	}

	.col-handle {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		color: var(--ink-mid);
	}

	.col-name {
		color: var(--ink);
		font-weight: 500;
	}

	.col-address {
		color: var(--ink-mid);
	}

	.col-numeric {
		text-align: right;
		color: var(--ink-mid);
	}

	.col-details {
		color: var(--ink);
	}

	.col-time {
		color: var(--ink-faint);
		white-space: nowrap;
		font-size: var(--text-xs);
	}

	.type-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		color: var(--ink-mid);
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

	.standing-badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.standing-badge--forming {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.standing-badge--good_standing {
		background: var(--accent-lt);
		color: var(--accent);
	}

	.standing-badge--suspended {
		background: var(--danger-lt);
		color: var(--danger);
	}

	.standing-badge--defunct {
		background: var(--border-faint);
		color: var(--ink-faint);
	}
</style>
