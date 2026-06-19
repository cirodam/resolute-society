<script lang="ts">
	import { formatDateTime } from '$lib/client/datetime';
	import { governanceTabs } from '$lib/client/navigation';
	import type { PageData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data }: { data: PageData } = $props();
	const society = $derived(data.society);
	const summary = $derived(data.summary);

	type Row =
		| { kind: 'inbound'; id: string; from: string; to: string; amount: number; ts: Date; status: string }
		| { kind: 'outbound'; id: string; from: string; to: string; amount: number; ts: Date; status: string };

	const rows = $derived<Row[]>([
		...data.inbound.map((t) => ({
			kind: 'inbound' as const,
			id: t.id,
			from: t.from_principal,
			to: t.to_principal,
			amount: t.amount,
			ts: t.received_at,
			status: 'received'
		})),
		...data.outbound.map((t) => ({
			kind: 'outbound' as const,
			id: t.id,
			from: t.from_principal,
			to: t.to_principal,
			amount: t.amount,
			ts: t.created_at,
			status: t.status
		}))
	].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()));
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Federation Ledger</h1>
		<p class="page-header-description">
			All federation credit activity for {society.name}
		</p>
	</div>

	<Subnav tabs={governanceTabs} />

	<div class="page-content">
		<div class="summary-grid">
			<div class="summary-card card-border">
				<div class="summary-label t-label">Minted</div>
				<div class="summary-value t-numeric">{summary.totalMinted.toFixed(2)}</div>
				<div class="summary-currency">FC</div>
			</div>
			<div class="summary-card card-border">
				<div class="summary-label t-label">Received from Peers</div>
				<div class="summary-value t-numeric">{summary.totalReceivedFromPeers.toFixed(2)}</div>
				<div class="summary-currency">FC</div>
			</div>
			<div class="summary-card card-border">
				<div class="summary-label t-label">Sent (Settled)</div>
				<div class="summary-value t-numeric">{summary.totalSentSettled.toFixed(2)}</div>
				<div class="summary-currency">FC</div>
			</div>
			<div class="summary-card card-border">
				<div class="summary-label t-label">Sent (Pending)</div>
				<div class="summary-value t-numeric pending">{summary.totalSentPending.toFixed(2)}</div>
				<div class="summary-currency">FC</div>
			</div>
		</div>

		{#if rows.length === 0}
			<EmptyState message="No federation credit transactions yet." card />
		{:else}
			<div class="ledger-table card-border">
				<div class="table-header">
					<div class="col-date">Date</div>
					<div class="col-dir">Dir</div>
					<div class="col-from">From</div>
					<div class="col-to">To</div>
					<div class="col-amount">Amount</div>
					<div class="col-status">Status</div>
				</div>
				<div class="table-body">
					{#each rows as row}
						<div class="table-row">
							<div class="col-date">
								<span class="date-text">{formatDateTime(row.ts)}</span>
							</div>
							<div class="col-dir">
								<span class="dir-badge dir-badge--{row.kind}">{row.kind}</span>
							</div>
							<div class="col-from">
								<span class="principal">{row.from}</span>
							</div>
							<div class="col-to">
								<span class="principal">{row.to}</span>
							</div>
							<div class="col-amount">
								<span class="amount-text t-numeric">{row.amount.toFixed(2)}</span>
							</div>
							<div class="col-status">
								<span class="status-badge status-badge--{row.status}">{row.status}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4);
	}

	.summary-card {
		padding: var(--space-5);
		text-align: center;
	}

	.summary-label {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin-bottom: var(--space-2);
	}

	.summary-value {
		font-size: var(--text-3xl);
		color: var(--ink);
	}

	.summary-value.pending {
		color: var(--gold);
	}

	.summary-currency {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		margin-top: var(--space-1);
	}

	.ledger-table {
		overflow-x: auto;
	}

	.table-header {
		display: grid;
		grid-template-columns: 160px 90px 1fr 1fr 120px 100px;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.table-body {
		display: flex;
		flex-direction: column;
	}

	.table-row {
		display: grid;
		grid-template-columns: 160px 90px 1fr 1fr 120px 100px;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: 1px solid var(--border-faint);
		align-items: center;
		transition: background 0.15s;
	}

	.table-row:hover { background: var(--surface-dk); }
	.table-row:last-child { border-bottom: none; }

	.date-text {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.dir-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		padding: var(--space-1) var(--space-2);
	}

	.dir-badge--inbound {
		background: var(--tint-green);
		color: var(--green);
	}

	.dir-badge--outbound {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.principal {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.03em;
		color: var(--ink-mid);
		word-break: break-all;
	}

	.col-amount {
		display: flex;
		align-items: center;
		justify-content: flex-end;
	}

	.amount-text {
		font-size: var(--text-lg);
		color: var(--ink);
	}

	.status-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		padding: var(--space-1) var(--space-2);
	}

	.status-badge--received,
	.status-badge--settled {
		background: var(--accent-lt);
		color: var(--accent);
	}

	.status-badge--pending {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.status-badge--escrowed {
		background: var(--surface-dk);
		color: var(--ink-mid);
	}
</style>
