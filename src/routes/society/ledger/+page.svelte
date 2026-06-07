<script lang="ts">
	import { formatDateTime, formatLongDate } from '$lib/client/datetime';
	import { economyTabs } from '$lib/client/navigation';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
	const transactions = $derived(data.transactions);
	const todayRecord = $derived(data.todayRecord);
	const recentDays = $derived(data.recentDays);
	const members = $derived(data.members);
</script>

<div class="page-container page-container--wide">
	<div class="page-header">
		<h1 class="t-display">Master Ledger</h1>
		<p class="page-header-description">
			Complete transaction history for {society.name}
		</p>
	</div>

	<Subnav tabs={economyTabs} />

	<div class="page-content">

		<div class="day-panel card-border">
			<div class="day-panel-header">
				<h2 class="t-label">Today — {formatLongDate(data.today)}</h2>
				{#if todayRecord?.status === 'closed'}
					<span class="status-badge closed">Closed — Page {todayRecord.page_number}</span>
				{:else if todayRecord?.status === 'open'}
					<span class="status-badge open">Open</span>
				{:else}
					<span class="status-badge pending">Not yet opened</span>
				{/if}
			</div>

			{#if form?.closeDayError}
				<p class="form-error">{form.closeDayError}</p>
			{/if}
			{#if form?.closeDaySuccess}
				<p class="form-success">
					Day closed — Page {form.pageNumber}.
					<a href="/society/ledger/day/{form.date}">View & print</a>
				</p>
			{/if}

			{#if !todayRecord || todayRecord.status === 'open'}
				<form method="POST" action="?/closeDay" use:enhance class="close-form">
					<label class="field-label" for="witnessed_by_id">Witness (optional)</label>
					<select id="witnessed_by_id" name="witnessed_by_id" class="field-select">
						<option value="">None</option>
						{#each members as m}
							<option value={m.id}>{m.given_name} {m.surname}</option>
						{/each}
					</select>
					<button type="submit" class="btn-primary">Close Today's Ledger</button>
				</form>
			{:else if todayRecord.status === 'closed'}
				<div class="closed-day-info">
					<p>Closed by {todayRecord.closed_by_name ?? '—'}
					{#if todayRecord.witnessed_by_name}
						· Witnessed by {todayRecord.witnessed_by_name}
					{/if}
					</p>
					<div class="closed-day-actions">
						<a href="/society/ledger/day/{todayRecord.date}" class="btn-secondary">
							View &amp; Print Page {todayRecord.page_number}
						</a>
						{#if !todayRecord.printed_at}
							<form method="POST" action="?/markPrinted" use:enhance style="display:inline">
								<input type="hidden" name="day_id" value={todayRecord.id} />
								<button type="submit" class="btn-ghost">Mark as Printed</button>
							</form>
						{:else}
							<span class="printed-badge">Printed</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		{#if recentDays.length > 0}
			<div class="recent-days">
				<h2 class="t-label section-label">Recent Days</h2>
				<div class="days-table card-border">
					<div class="days-header">
						<div>Page</div>
						<div>Date</div>
						<div>Transactions</div>
						<div>Closing Balance</div>
						<div>Total Supply</div>
						<div>Status</div>
						<div></div>
					</div>
					{#each recentDays as day}
						<div class="days-row">
							<div class="t-numeric page-num">{day.page_number}</div>
							<div>{formatLongDate(day.date)}</div>
							<div class="t-numeric">{day.transaction_count}</div>
							<div class="t-numeric">{day.closing_balance.toFixed(2)} SC</div>
							<div class="t-numeric">{day.total_supply.toFixed(2)} SC</div>
							<div>
								{#if day.status === 'open'}
									<span class="status-badge open">Open</span>
								{:else if day.printed_at}
									<span class="status-badge printed">Printed</span>
								{:else}
									<span class="status-badge closed">Closed</span>
								{/if}
							</div>
							<div>
								<a href="/society/ledger/day/{day.date}" class="link-subtle">View</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="all-transactions">
			<h2 class="t-label section-label">All Transactions</h2>
			{#if transactions.length === 0}
				<div class="empty-state card-border">
					<p>No transactions recorded yet.</p>
				</div>
			{:else}
				<div class="ledger-table card-border">
					<div class="table-header">
						<div class="col-date">Date</div>
						<div class="col-from">From</div>
						<div class="col-to">To</div>
						<div class="col-amount">Amount</div>
						<div class="col-note">Note</div>
					</div>

					<div class="table-body">
						{#each transactions as txn}
							<div class="table-row">
								<div class="col-date">
									<span class="date-text">{formatDateTime(txn.created_at)}</span>
								</div>
								<div class="col-from">
									<div class="entity-cell">
										<span class="entity-name">{txn.from_name}</span>
										<span class="entity-handle">@{txn.from_handle}</span>
										<span class="entity-type">{txn.from_type}</span>
									</div>
								</div>
								<div class="col-to">
									<div class="entity-cell">
										<span class="entity-name">{txn.to_name}</span>
										<span class="entity-handle">@{txn.to_handle}</span>
										<span class="entity-type">{txn.to_type}</span>
									</div>
								</div>
								<div class="col-amount">
									<span class="amount-text t-numeric">{txn.amount.toFixed(2)}</span>
								</div>
								<div class="col-note">
									<span class="note-text">{txn.note || '—'}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.page-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	/* Day panel */
	.day-panel {
		padding: var(--space-5);
	}

	.day-panel-header {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
	}

	.day-panel-header h2 {
		margin: 0;
	}

	.status-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		padding: 0.2em 0.6em;
		border-radius: 2px;
	}

	.status-badge.open { background: var(--surface-dk); color: var(--ink-mid); }
	.status-badge.closed { background: var(--accent-faint, #e8e0d0); color: var(--ink); }
	.status-badge.printed { background: var(--surface-dk); color: var(--ink-faint); }
	.status-badge.pending { color: var(--ink-faint); }

	.close-form {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.field-label {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.field-select {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		min-width: 200px;
	}

	.closed-day-info {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.closed-day-actions {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.printed-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-faint);
	}

	/* Recent days table */
	.days-table {
		overflow-x: auto;
	}

	.days-header,
	.days-row {
		display: grid;
		grid-template-columns: 60px 1fr 100px 160px 160px 100px 60px;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		align-items: center;
	}

	.days-header {
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.days-row {
		border-bottom: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.days-row:last-child { border-bottom: none; }

	.page-num {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink-mid);
	}

	.link-subtle {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--ink-mid);
		text-decoration: none;
		border-bottom: 1px solid var(--border);
	}

	.ledger-table {
		overflow-x: auto;
	}

	.table-header {
		display: grid;
		grid-template-columns: 160px 1fr 1fr 120px 1fr;
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

	.table-body { display: flex; flex-direction: column; }

	.table-row {
		display: grid;
		grid-template-columns: 160px 1fr 1fr 120px 1fr;
		gap: var(--space-3);
		padding: var(--space-4);
		border-bottom: 1px solid var(--border-faint);
		transition: background 0.15s;
	}

	.table-row:hover { background: var(--surface-dk); }
	.table-row:last-child { border-bottom: none; }

	.col-date, .col-from, .col-to { display: flex; align-items: center; }

	.date-text {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.entity-cell {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.entity-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink);
	}

	.entity-handle {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.entity-type {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		text-transform: lowercase;
		letter-spacing: 0.05em;
		color: var(--ink-faint);
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

	.col-note { display: flex; align-items: center; }

	.note-text {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
	}
</style>
