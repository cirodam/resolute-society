<script lang="ts">
	import { enhance } from '$app/forms';
	import { governanceTabs } from '$lib/client/navigation';
	import { hasPermission } from '$lib/client/permissions';
	import type { PageData, ActionData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import UniversalAllowancesPanel from './UniversalAllowancesPanel.svelte';
	import GroupedAllowancesPanel from './GroupedAllowancesPanel.svelte';
	import PositionPayrollPanel from './PositionPayrollPanel.svelte';
	import TransferPanel from './TransferPanel.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);

	let demurrageMode = $state<'percent' | 'flat'>('percent');
	let demurrageValue = $state(0);

	const demurragePreview = $derived(() => {
		if (data.principalCredits === 0) return 'No principals with credits';
		if (demurrageMode === 'percent') {
			const totalAmount = (data.principalCredits * demurrageValue) / 100;
			return `≈ ${totalAmount.toFixed(2)} total from principals`;
		} else {
			const percent = (demurrageValue / data.principalCredits) * 100;
			return `≈ ${percent.toFixed(2)}% of principal holdings`;
		}
	});
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Treasury</h1>
		<p class="page-header-description">
			{society.name} balances and transactions
		</p>
	</div>

	<Subnav tabs={governanceTabs} />

	<div class="page-content">
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
						<span class="supply-col-label t-label">Expected (person-years)</span>
						<span class="supply-col-amount t-numeric">{data.expectedMoneySupply.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="demurrage-section">
			<h2 class="section-title">Supply Reconciliation</h2>

			<Alert type="success" message={form?.endowmentMintSuccess ? `Minted ${form.minted.toFixed(2)} credits to treasury. Supply is now ${form.totalSupply.toFixed(2)} against target ${form.expectedSupply.toFixed(2)}.` : null} />
			<Alert type="success" message={form?.supplyReconcileSuccess ? `Burned ${form.burned.toFixed(2)} credits across ${form.principalCount} principals. Remaining excess: ${form.remainingExcess.toFixed(2)}.` : null} />

			<div class="demurrage-card card-border">
				<p class="demurrage-description">
					Reconcile supply against person-year endowment. Mint fills shortfall; reconciliation
					demurrage burns excess.
				</p>

				{#if hasPermission(data.permissions, 'treasury.run_demurrage')}
					<div class="reconcile-actions">
						<form method="POST" action="?/reconcileEndowmentMint" use:enhance>
							<ConfirmButton class="btn btn--secondary">Mint Endowment Shortfall</ConfirmButton>
						</form>
						<form method="POST" action="?/runSupplyReconciliationDemurrage" use:enhance>
							<ConfirmButton class="btn btn--primary">Run Supply Reconciliation Demurrage</ConfirmButton>
						</form>
					</div>
				{/if}
			</div>
		</div>

		<div class="demurrage-section">
			<h2 class="section-title">Run Demurrage</h2>

			<Alert type="success" message={form?.success ? `Collected ${form.collected.toFixed(2)} credits from ${form.principalCount} principals` : null} />
			<Alert type="error" message={form?.error} />

			<div class="demurrage-card card-border">
				<p class="demurrage-description">
					Collect society credits from all members and associations to the treasury
				</p>

				{#if hasPermission(data.permissions, 'treasury.run_demurrage')}
					<form method="POST" action="?/runDemurrage" use:enhance class="demurrage-form">
						<input type="hidden" name="mode" value={demurrageMode} />

						<div class="mode-toggle">
							<button
								type="button"
								class="mode-btn"
								class:active={demurrageMode === 'percent'}
								onclick={() => (demurrageMode = 'percent')}
							>
								Percentage
							</button>
							<button
								type="button"
								class="mode-btn"
								class:active={demurrageMode === 'flat'}
								onclick={() => (demurrageMode = 'flat')}
							>
								Flat Amount
							</button>
						</div>

						<div class="input-group">
							{#if demurrageMode === 'percent'}
								<label for="value">Percentage to collect from each principal</label>
								<div class="input-with-unit">
									<input
										id="value"
										name="value"
										type="number"
										step="0.01"
										min="0"
										max="100"
										bind:value={demurrageValue}
										required
									/>
									<span class="unit">%</span>
								</div>
								<span class="input-hint">{demurragePreview()}</span>
							{:else}
								<label for="value">Fixed amount to collect from each principal</label>
								<div class="input-with-unit">
									<input
										id="value"
										name="value"
										type="number"
										step="0.01"
										min="0"
										bind:value={demurrageValue}
										required
									/>
									<span class="unit">credits</span>
								</div>
								<span class="input-hint">{demurragePreview()}</span>
							{/if}
						</div>

						<ConfirmButton class="btn btn--primary">Run Demurrage</ConfirmButton>
					</form>
				{/if}
			</div>
		</div>

		<div class="disbursement-divider">
			<h2 class="disbursement-header t-display-sm">Credit Disbursement Methods</h2>
			<p class="disbursement-description">Four ways to distribute society credits to members</p>
		</div>

		<UniversalAllowancesPanel memberCount={data.memberCount} permissions={data.permissions} {form} />
		<GroupedAllowancesPanel
			allowanceGroups={data.allowanceGroups}
			membersByGroup={data.membersByGroup}
			members={data.members}
			permissions={data.permissions}
			{form}
		/>
		<PositionPayrollPanel positions={data.positions} permissions={data.permissions} {form} />
		<TransferPanel societyCredits={society.society_credits} permissions={data.permissions} {form} />
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

	.demurrage-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.demurrage-card {
		padding: var(--space-5);
	}

	.demurrage-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5) 0;
	}

	.reconcile-actions {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.demurrage-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.mode-toggle {
		display: flex;
		gap: var(--space-2);
	}

	.mode-btn {
		flex: 1;
		padding: var(--space-3);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.1em;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--ink-mid);
		cursor: pointer;
		transition: all 0.15s;
	}

	.mode-btn:hover {
		border-color: var(--border-strong);
	}

	.mode-btn.active {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.input-with-unit {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.input-with-unit input {
		flex: 1;
		padding: var(--space-3);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-prose);
		font-size: var(--text-base);
	}

	.input-with-unit input:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.unit {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		white-space: nowrap;
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.disbursement-divider {
		margin: var(--space-10) 0 var(--space-8) 0;
		padding: var(--space-6) 0;
		border-top: 2px solid var(--border);
		border-bottom: 2px solid var(--border);
		text-align: center;
	}

	.disbursement-header {
		font-size: var(--text-2xl);
		margin: 0 0 var(--space-2) 0;
		color: var(--ink);
	}

	.disbursement-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}
</style>
