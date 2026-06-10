<script lang="ts">
	import { formatTime, formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, day, transactions, closingBalance, totalSupply } = $derived(data);

	const CONTINUATION_LINES = 12;
</script>

<div class="toolbar no-print">
	<a href="/society/ledger" class="back-link">← Ledger</a>
	<button onclick={() => window.print()} class="print-btn">Print Page {day.page_number}</button>
	{#if day.status === 'open'}
		<span class="open-warning">This day is still open — balances will reflect close time</span>
	{/if}
</div>

<div class="ledger-page">
	<header class="page-header">
		<div class="header-society">{society.name}</div>
		<div class="header-center">
			<div class="header-title">Daily Ledger</div>
			<div class="header-date">{formatLongDate(day.date)}</div>
		</div>
		<div class="header-page">Page {day.page_number}</div>
	</header>

	<div class="balance-block opening">
		<span class="balance-label">Opening Balance — Society Treasury</span>
		<span class="balance-amount">{day.opening_balance.toFixed(2)} SC</span>
	</div>

	<table class="txn-table">
		<thead>
			<tr>
				<th class="col-time">Time</th>
				<th class="col-from">From</th>
				<th class="col-to">To</th>
				<th class="col-amount">Amount (SC)</th>
				<th class="col-note">Note</th>
			</tr>
		</thead>
		<tbody>
			{#each transactions as txn}
				<tr>
					<td class="col-time mono">{formatTime(txn.created_at)}</td>
					<td class="col-from">{txn.from_name}</td>
					<td class="col-to">{txn.to_name}</td>
					<td class="col-amount mono">{txn.amount.toFixed(2)}</td>
					<td class="col-note">{txn.note ?? ''}</td>
				</tr>
			{/each}
			{#if transactions.length === 0}
				<tr>
					<td colspan="5" class="no-txn">No transactions recorded</td>
				</tr>
			{/if}
		</tbody>
	</table>

	{#if day.status === 'open'}
		<div class="open-notice">Day in progress — not yet closed</div>
	{:else}
		<div class="balance-block closing">
			<span class="balance-label">Closing Balance — Society Treasury</span>
			<span class="balance-amount">{closingBalance?.toFixed(2)} SC</span>
		</div>
		<div class="balance-block supply">
			<span class="balance-label">Total in Circulation</span>
			<span class="balance-amount">{totalSupply?.toFixed(2)} SC</span>
		</div>
	{/if}

	<div class="signature-block">
		<div class="sig-row">
			<span class="sig-label">Closed by</span>
			<span class="sig-name">{day.closed_by_name ?? ''}</span>
			<span class="sig-line-label">Signature</span>
			<span class="sig-line"></span>
		</div>
		<div class="sig-row">
			<span class="sig-label">Witnessed by</span>
			<span class="sig-name">{day.witnessed_by_name ?? ''}</span>
			<span class="sig-line-label">Signature</span>
			<span class="sig-line"></span>
		</div>
	</div>

	<div class="continuation-block">
		<div class="continuation-header">Continuation Entries</div>
		<table class="cont-table">
			<thead>
				<tr>
					<th class="cont-time">Time</th>
					<th class="cont-from">From</th>
					<th class="cont-to">To</th>
					<th class="cont-amount">Amount</th>
					<th class="cont-note">Note</th>
					<th class="cont-init">Initials</th>
				</tr>
			</thead>
			<tbody>
				{#each Array(CONTINUATION_LINES) as _}
					<tr class="cont-row">
						<td class="cont-time"></td>
						<td class="cont-from"></td>
						<td class="cont-to"></td>
						<td class="cont-amount"></td>
						<td class="cont-note"></td>
						<td class="cont-init"></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="page-footer">
		{society.name} · {formatLongDate(day.date)} · Page {day.page_number}
	</div>
</div>

<style>
	/* ── Screen toolbar ── */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--border);
		background: var(--surface-dk);
	}

	.back-link {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--ink-mid);
		text-decoration: none;
	}

	.print-btn {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}

	.open-warning {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
	}

	/* ── Page layout ── */
	.ledger-page {
		max-width: 760px;
		margin: 2rem auto;
		padding: 2rem;
		background: white;
		color: #111;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 11pt;
		border: 1px solid #ccc;
	}

	/* ── Header ── */
	.page-header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: baseline;
		border-bottom: 2px solid #111;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}

	.header-society {
		font-size: 13pt;
		font-weight: bold;
		letter-spacing: 0.02em;
	}

	.header-center {
		text-align: center;
	}

	.header-title {
		font-size: 10pt;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #555;
	}

	.header-date {
		font-size: 11pt;
		font-weight: bold;
	}

	.header-page {
		text-align: right;
		font-size: 10pt;
		color: #555;
		font-variant-numeric: tabular-nums;
	}

	/* ── Balances ── */
	.balance-block {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.4rem 0;
		border-bottom: 1px solid #ccc;
	}

	.balance-block.opening {
		margin-bottom: 0.75rem;
		border-bottom: 2px solid #111;
	}

	.balance-block.closing {
		margin-top: 0.75rem;
		border-top: 2px solid #111;
		border-bottom: none;
		padding-top: 0.5rem;
		font-weight: bold;
	}

	.balance-block.supply {
		border-bottom: none;
		color: #444;
		font-size: 10pt;
	}

	.balance-label {
		font-size: 10pt;
		letter-spacing: 0.03em;
	}

	.balance-amount {
		font-variant-numeric: tabular-nums;
		font-size: 12pt;
		font-weight: bold;
	}

	/* ── Transaction table ── */
	.txn-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 0;
		font-size: 10pt;
	}

	.txn-table th {
		border-top: 1px solid #888;
		border-bottom: 1px solid #888;
		padding: 0.3rem 0.4rem;
		text-align: left;
		font-weight: normal;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		font-size: 8pt;
		color: #444;
	}

	.txn-table td {
		padding: 0.35rem 0.4rem;
		border-bottom: 1px solid #e0e0e0;
		vertical-align: top;
	}

	.col-time { width: 70px; }
	.col-from { width: 18%; }
	.col-to   { width: 18%; }
	.col-amount { width: 90px; text-align: right; }

	.txn-table .col-amount { text-align: right; }
	.txn-table th.col-amount { text-align: right; }

	.mono { font-variant-numeric: tabular-nums; }

	.no-txn {
		text-align: center;
		color: #888;
		font-style: italic;
		padding: 1rem;
	}

	.open-notice {
		text-align: center;
		font-style: italic;
		color: #666;
		font-size: 10pt;
		padding: 0.75rem;
		border-top: 1px dashed #ccc;
		border-bottom: 1px dashed #ccc;
		margin: 0.75rem 0;
	}

	/* ── Signatures ── */
	.signature-block {
		margin-top: 1.5rem;
		border-top: 2px solid #111;
		padding-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.sig-row {
		display: grid;
		grid-template-columns: 90px 160px 70px 1fr;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 10pt;
	}

	.sig-label {
		font-size: 9pt;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #555;
	}

	.sig-name {
		font-weight: bold;
		border-bottom: 1px solid #555;
		min-width: 120px;
	}

	.sig-line-label {
		font-size: 9pt;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #555;
		text-align: right;
	}

	.sig-line {
		border-bottom: 1px solid #555;
	}

	/* ── Continuation entries ── */
	.continuation-block {
		margin-top: 1.5rem;
		border-top: 1px solid #888;
		padding-top: 0.75rem;
	}

	.continuation-header {
		font-size: 8pt;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #555;
		margin-bottom: 0.5rem;
	}

	.cont-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10pt;
	}

	.cont-table th {
		border-bottom: 1px solid #888;
		padding: 0.2rem 0.3rem;
		font-size: 8pt;
		font-weight: normal;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #555;
		text-align: left;
	}

	.cont-time   { width: 55px; }
	.cont-from   { width: 16%; }
	.cont-to     { width: 16%; }
	.cont-amount { width: 80px; }
	.cont-init   { width: 55px; }

	.cont-row td {
		border-bottom: 1px solid #e0e0e0;
		padding: 0.6rem 0.3rem 0;
		height: 1.6rem;
	}

	/* ── Footer ── */
	.page-footer {
		margin-top: 1.5rem;
		border-top: 1px solid #ccc;
		padding-top: 0.4rem;
		font-size: 8pt;
		color: #888;
		text-align: center;
		letter-spacing: 0.04em;
	}

	/* ── Print styles ── */
	@media print {
		.no-print {
			display: none !important;
		}

		.ledger-page {
			margin: 0;
			padding: 1.5cm 2cm;
			border: none;
			max-width: none;
		}

		.txn-table td {
			border-bottom: 1px solid #ccc;
		}

		.cont-row td {
			border-bottom: 1px solid #ddd;
		}

		@page {
			size: letter portrait;
			margin: 0;
		}
	}
</style>
