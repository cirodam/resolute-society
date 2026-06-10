<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateTime } from '$lib/client/datetime';
	import type { PageData } from './$types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import TabNav from '$lib/components/TabNav.svelte';

	let { data }: { data: PageData } = $props();
	const person = $derived(data.person);

	let activeTab = $state<'society' | 'federation'>('society');

	// Per-tab send state
	let societySend = $state<{ pending: boolean; result: { ok: boolean; settled?: string; error?: string } | null }>({ pending: false, result: null });
	let fedSend = $state<{ pending: boolean; result: { ok: boolean; settled?: string; error?: string } | null }>({ pending: false, result: null });

	function isCredit(txn: { to_type: string; to_id: string }, myId: string) {
		return txn.to_type === 'person' && txn.to_id === myId;
	}

	function getOtherParty(txn: any, myId: string) {
		return txn.from_type === 'person' && txn.from_id === myId
			? { name: txn.to_name, handle: txn.to_handle }
			: { name: txn.from_name, handle: txn.from_handle };
	}

	function fedIsCredit(txn: { to_principal: string }, principal: string) {
		return txn.to_principal === principal;
	}

	function fedOtherParty(txn: { from_principal: string; to_principal: string }, principal: string) {
		return txn.to_principal === principal ? txn.from_principal : txn.to_principal;
	}
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">My Passbook</h1>
		<p class="page-header-description">
			{person.given_name} {person.surname} · {person.handle}
		</p>
	</div>

	{#if person.bio}
		<div class="bio-section card-border">
			<p class="bio-text">{person.bio}</p>
		</div>
	{/if}

	<TabNav
		tabs={[
			{ value: 'society', label: 'Society Credits' },
			...(data.isAdmitted ? [{ value: 'federation', label: 'Federation Credits' }] : [])
		]}
		active={activeTab}
		onchange={(v) => (activeTab = v as 'society' | 'federation')}
	/>

	<!-- ── SOCIETY CREDITS TAB ── -->
	{#if activeTab === 'society'}
		<div class="tab-content">
			<div class="balance-card card-border">
				<div class="card-header">
					<h2>Society Credits</h2>
				</div>
				<div class="balance-body">
					<div class="balance-amount t-numeric">{person.society_credits.toFixed(2)}</div>
				</div>
			</div>

			<div class="send-card card-border">
				<div class="card-header">
					<h2>Send Society Credits</h2>
				</div>
				<form
					method="POST"
					action="?/send"
					use:enhance={() => {
						societySend.pending = true;
						societySend.result = null;
						return async ({ result: r, update }) => {
							await update({ reset: false });
							societySend.pending = false;
							if (r.type === 'success' && r.data?.sent) {
								societySend.result = { ok: true, settled: r.data.settled as string };
							} else if (r.type === 'failure') {
								societySend.result = { ok: false, error: String(r.data?.sendError ?? 'Unknown error') };
							}
						};
					}}
					class="send-form"
				>
					<input type="hidden" name="currency" value="society_credits" />
					<div class="form-group">
						<label for="sc-to">Recipient</label>
						<input id="sc-to" name="toPrincipal" type="text" placeholder="uuid@society-uuid" required class="input" />
					</div>
					<div class="form-group">
						<label for="sc-amount">Amount</label>
						<input id="sc-amount" name="amount" type="number" step="0.01" min="0.01" required class="input" />
					</div>
					<div class="send-actions">
						<button type="submit" class="btn btn--primary" disabled={societySend.pending}>
							{societySend.pending ? 'Sending…' : 'Send'}
						</button>
					</div>
				</form>
				{#if societySend.result}
					{#if societySend.result.ok}
						<div class="result result--success">Settled — recorded in the local ledger.</div>
					{:else}
						<div class="result result--error">{societySend.result.error}</div>
					{/if}
				{/if}
			</div>

			<div class="passbook-table card-border">
				<div class="card-header">
					<h2>Transaction History</h2>
				</div>
				{#if data.societyTransactions.length === 0}
					<EmptyState message="No transactions yet." />
				{:else}
					<div class="passbook-header">
							<div class="col-date">Date</div>
							<div class="col-party">From / To</div>
							<div class="col-note">Note</div>
							<div class="col-amount">Debit</div>
							<div class="col-amount">Credit</div>
							<div class="col-balance">Balance</div>
						</div>
						<div class="passbook-body">
							{#each data.societyTransactions as txn}
								{@const other = getOtherParty(txn, person.id)}
								{@const credit = isCredit(txn, person.id)}
								<div class="passbook-row">
									<div class="col-date"><span class="date-text">{formatDateTime(txn.created_at)}</span></div>
									<div class="col-party">
										<div class="party-cell">
											<span class="party-name">{other.name}</span>
											<span class="party-handle">{other.handle}</span>
										</div>
									</div>
									<div class="col-note"><span class="note-text">{txn.note || '—'}</span></div>
									<div class="col-amount">
										{#if !credit}<span class="amount-debit t-numeric">-{txn.amount.toFixed(2)}</span>
										{:else}<span class="amount-empty">—</span>{/if}
									</div>
									<div class="col-amount">
										{#if credit}<span class="amount-credit t-numeric">+{txn.amount.toFixed(2)}</span>
										{:else}<span class="amount-empty">—</span>{/if}
									</div>
									<div class="col-balance"><span class="balance-text t-numeric">{txn.running_balance.toFixed(2)}</span></div>
								</div>
							{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── FEDERATION CREDITS TAB ── -->
	{#if activeTab === 'federation'}
		<div class="tab-content">
			<div class="balance-card card-border">
				<div class="card-header">
					<h2>Federation Credits</h2>
				</div>
				<div class="balance-body">
					<div class="balance-amount t-numeric">{person.federation_credits.toFixed(2)}</div>
				</div>
			</div>

			{#if !data.hasKeypair}
				<div class="warning-banner card-border">Your account keypair has not been generated yet. Federation transfers are unavailable.</div>
			{:else}
				<div class="send-card card-border">
					<div class="card-header">
						<h2>Send Federation Credits</h2>
					</div>
					<form
						method="POST"
						action="?/send"
						use:enhance={() => {
							fedSend.pending = true;
							fedSend.result = null;
							return async ({ result: r, update }) => {
								await update({ reset: false });
								fedSend.pending = false;
								if (r.type === 'success' && r.data?.sent) {
									fedSend.result = { ok: true, settled: r.data.settled as string };
								} else if (r.type === 'failure') {
									fedSend.result = { ok: false, error: String(r.data?.sendError ?? 'Unknown error') };
								}
							};
						}}
						class="send-form"
					>
						<input type="hidden" name="currency" value="federation_credits" />
						<div class="form-group">
							<label for="fc-to">Recipient</label>
							<input id="fc-to" name="toPrincipal" type="text" placeholder="uuid@society-uuid" required class="input" />
						</div>
						<div class="form-group">
							<label for="fc-amount">Amount</label>
							<input id="fc-amount" name="amount" type="number" step="0.01" min="0.01" required class="input" />
						</div>
						<div class="send-actions">
							<button type="submit" class="btn btn--primary" disabled={fedSend.pending}>
								{fedSend.pending ? 'Sending…' : 'Send'}
							</button>
						</div>
					</form>
					{#if fedSend.result}
						{#if fedSend.result.ok}
							<div class="result result--success">Submitted to the federation for settlement.</div>
						{:else}
							<div class="result result--error">{fedSend.result.error}</div>
						{/if}
					{/if}
				</div>
			{/if}

			<div class="passbook-table card-border">
				<div class="card-header">
					<h2>Transaction History</h2>
				</div>
				{#if data.federationTransactions.length === 0}
					<EmptyState message="No federation transactions yet." />
				{:else}
					<div class="passbook-header">
							<div class="col-date">Date</div>
							<div class="col-party">From / To</div>
							<div class="col-note">Note</div>
							<div class="col-amount">Debit</div>
							<div class="col-amount">Credit</div>
							<div class="col-balance">Balance</div>
						</div>
						<div class="passbook-body">
							{#each data.federationTransactions as txn}
								{@const other = fedOtherParty(txn, data.principal)}
								{@const credit = fedIsCredit(txn, data.principal)}
								<div class="passbook-row">
									<div class="col-date"><span class="date-text">{formatDateTime(txn.created_at)}</span></div>
									<div class="col-party"><span class="party-name">{other}</span></div>
									<div class="col-note"><span class="note-text">{txn.note || '—'}</span></div>
									<div class="col-amount">
										{#if !credit}<span class="amount-debit t-numeric">-{txn.amount.toFixed(2)}</span>
										{:else}<span class="amount-empty">—</span>{/if}
									</div>
									<div class="col-amount">
										{#if credit}<span class="amount-credit t-numeric">+{txn.amount.toFixed(2)}</span>
										{:else}<span class="amount-empty">—</span>{/if}
									</div>
									<div class="col-balance"><span class="balance-text t-numeric">{txn.running_balance.toFixed(2)}</span></div>
								</div>
							{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page-header {
		margin-bottom: var(--space-6);
	}

	.bio-section {
		padding: var(--space-5);
		margin-bottom: var(--space-5);
	}

	.bio-text { margin: 0; font-family: var(--font-prose); font-size: var(--text-base); }

	/* Tab content */
	.tab-content { display: flex; flex-direction: column; gap: var(--space-8); }

	.balance-body {
		padding: var(--space-4) var(--space-5);
	}

	.balance-amount { font-size: var(--text-3xl); color: var(--ink); }

	/* Send card */
	.send-form {
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		align-items: end;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-5);
	}

	.send-actions {
		display: flex;
		align-items: flex-end;
	}

	.result {
		padding: var(--space-3) var(--space-5);
		border-top: 1px solid var(--border-subtle);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.result--success { background: var(--tint-green); color: var(--accent); }
	.result--error   { background: var(--danger-lt); color: var(--danger); }

	.warning-banner {
		padding: var(--space-4);
		background: var(--tint-gold);
		color: var(--gold);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.passbook-table { overflow-x: auto; }

	.passbook-header,
	.passbook-row {
		display: grid;
		grid-template-columns: 140px 1fr 1fr 90px 90px 100px;
		gap: var(--space-3);
		padding: var(--space-4);
	}

	.passbook-header {
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.passbook-body { display: flex; flex-direction: column; }

	.passbook-row {
		border-bottom: 1px solid var(--border-faint);
		transition: background 0.1s;
	}

	.passbook-row:hover { background: var(--surface-dk); }
	.passbook-row:last-child { border-bottom: none; }

	.col-date, .col-party, .col-note { display: flex; align-items: center; }
	.col-amount, .col-balance { display: flex; align-items: center; justify-content: flex-end; }

	.date-text { font-family: var(--font-prose); font-size: var(--text-sm); color: var(--ink-mid); }
	.party-cell { display: flex; flex-direction: column; gap: 2px; }
	.party-name { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
	.party-handle { font-size: var(--text-xs); color: var(--ink-mid); }
	.note-text { font-family: var(--font-prose); font-size: var(--text-sm); color: var(--ink-mid); font-style: italic; }

	.amount-debit  { font-size: var(--text-base); color: var(--danger); }
	.amount-credit { font-size: var(--text-base); color: var(--accent); }
	.amount-empty  { font-size: var(--text-base); color: var(--ink-faint); }
	.balance-text  { font-size: var(--text-base); font-weight: 600; color: var(--ink); }
</style>
