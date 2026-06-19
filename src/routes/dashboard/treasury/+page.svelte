<script lang="ts">
	import { enhance } from '$app/forms';
	import { hasPermission } from '$lib/client/permissions';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
</script>

<div class="balances-grid">
	<div class="balance-card card-border">
		<div class="balance-label t-label">Society Treasury</div>
		<div class="balance-amount t-numeric">{society.society_credits.toFixed(2)}</div>
	</div>

	<div class="balance-card card-border">
		<div class="balance-label t-label">Federation Credits</div>
		<div class="balance-amount t-numeric">{society.federation_credits.toFixed(2)}</div>
	</div>
</div>

<div class="money-supply-section">
	<div class="money-supply-card card-border-accent">
		<h3 class="supply-title t-prose">Money Supply</h3>
		<div class="supply-columns">
			<div class="supply-col">
				<span class="supply-col-label t-label">Actual</span>
				<span class="supply-col-amount t-numeric">{data.totalMoneySupply.toFixed(2)}</span>
			</div>
			<div class="supply-divider"></div>
			<div class="supply-col">
				<span class="supply-col-label t-label">Expected (60k × members)</span>
				<span class="supply-col-amount t-numeric">{data.expectedMoneySupply.toFixed(2)}</span>
			</div>
		</div>
	</div>
</div>

<div class="reconcile-section">
	<h2 class="section-title">Supply Reconciliation</h2>

	<Alert type="success" message={form?.endowmentMintSuccess ? `Minted ${form.minted.toFixed(2)} local credits to treasury. Supply is now ${form.totalSupply.toFixed(2)} against target ${form.expectedSupply.toFixed(2)}.` : null} />
	<Alert type="success" message={form?.supplyReconcileSuccess ? `Burned ${form.burned.toFixed(2)} local credits across ${form.principalCount} principals. Remaining excess: ${form.remainingExcess.toFixed(2)}.` : null} />
	<Alert type="success" message={form?.fedBurnSuccess ? `Burned ${form.burned.toFixed(2)} federation credits from treasury. Remaining excess: ${form.remainingExcess.toFixed(2)}.` : null} />

	<div class="reconcile-grid">
		<div class="reconcile-col card-border">
			<div class="reconcile-col-label t-label">Local Credits</div>
			<p class="reconcile-description">Reconcile local supply against member endowment target (60,000 per member).</p>
			{#if hasPermission(data.permissions, 'treasury.run_demurrage')}
				<div class="reconcile-actions">
					<form method="POST" action="?/reconcileEndowmentMint" use:enhance>
						<ConfirmButton class="btn btn--secondary btn--small">Mint Shortfall</ConfirmButton>
					</form>
					<form method="POST" action="?/runSupplyReconciliationDemurrage" use:enhance>
						<ConfirmButton class="btn btn--primary btn--small">Burn Excess</ConfirmButton>
					</form>
				</div>
			{/if}
		</div>

		<div class="reconcile-col card-border">
			<div class="reconcile-col-label t-label">Federation Credits</div>
			<div class="fed-supply-row">
				<span class="fed-supply-stat">
					<span class="fed-supply-number t-numeric">{data.totalFedSupply.toFixed(2)}</span>
					<span class="fed-supply-hint">held across society</span>
				</span>
				<span class="fed-supply-stat">
					<span class="fed-supply-number t-numeric">{data.expectedFedSupply.toFixed(2)}</span>
					<span class="fed-supply-hint">issued (60k × members)</span>
				</span>
			</div>
			<p class="reconcile-description">Federation credits issued at member join flow freely to other societies. A balance below issued is normal. Burn excess if holdings exceed the issued amount.</p>
			{#if hasPermission(data.permissions, 'treasury.run_demurrage') && data.totalFedSupply > data.expectedFedSupply}
				<div class="reconcile-actions">
					<form method="POST" action="?/runFedSupplyReconciliationBurn" use:enhance>
						<ConfirmButton class="btn btn--primary btn--small">Burn Excess</ConfirmButton>
					</form>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.balances-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.balance-card {
		padding: var(--space-5);
		text-align: center;
	}

	.balance-label {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin-bottom: var(--space-3);
		text-transform: lowercase;
	}

	.balance-amount {
		font-size: var(--text-3xl);
		color: var(--ink);
	}

	.money-supply-section {
		margin-top: var(--space-6);
		padding-top: var(--space-6);
		border-top: 1px solid var(--border-subtle);
	}

	.money-supply-card {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.supply-title {
		font-weight: 600;
		margin: 0;
		font-size: var(--text-lg);
	}

	.supply-columns {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		align-items: stretch;
	}

	.supply-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-5);
		flex: 1;
		min-width: 140px;
	}

	.supply-col:first-child {
		padding-left: 0;
	}

	.supply-col-label {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.supply-col-amount {
		font-size: var(--text-2xl);
		color: var(--ink);
	}

	.supply-divider {
		width: 1px;
		background: var(--border-subtle);
		align-self: stretch;
		margin: var(--space-1) 0;
	}

	.reconcile-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.reconcile-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.reconcile-col {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.reconcile-col-label {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.reconcile-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.reconcile-actions {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: auto;
	}

	.fed-supply-row {
		display: flex;
		gap: var(--space-5);
	}

	.fed-supply-stat {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.fed-supply-number {
		font-size: var(--text-lg);
		color: var(--ink);
	}

	.fed-supply-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}
</style>
