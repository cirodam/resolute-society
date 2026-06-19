<script lang="ts">
	import { PERMISSION } from '$lib/permissions';
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/Alert.svelte';
	import { hasPermission } from '$lib/client/permissions';

	type Permissions = { isFounder: boolean; codes: string[] };

	let {
		societyCredits,
		permissions,
		form = null
	}: {
		societyCredits: number;
		permissions: Permissions | undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	let expanded = $state(false);
	let transferHandle = $state('');
	let transferAmount = $state(0);
</script>

<div class="transfer-section">
	<button class="section-header-numbered" onclick={() => (expanded = !expanded)} type="button">
		<span class="section-number">4</span>
		<div class="section-header-text">
			<h2 class="section-title">One-Off Transfers</h2>
			<p class="section-subtitle">Send credits to specific member or association</p>
		</div>
		<span class="chevron" class:expanded>▼</span>
	</button>

	{#if expanded}
		<Alert
			type="success"
			message={form?.transferSuccess
				? `Transferred ${form.amount.toFixed(2)} credits to ${form.recipient}`
				: null}
		/>
		<Alert type="error" message={form?.transferError ?? null} />

		<div class="transfer-card card-border">
			<p class="transfer-description">
				Send society credits from the treasury to a member or association
			</p>

			{#if hasPermission(permissions, PERMISSION.TREASURY_TRANSFER)}
				<form method="POST" action="?/transfer" use:enhance class="transfer-form">
					<div class="input-group">
						<label for="handle">Member or Association Handle</label>
						<input
							id="handle"
							name="handle"
							type="text"
							bind:value={transferHandle}
							placeholder="username or association-handle"
							required
						/>
						<span class="input-hint">Enter member or association handle</span>
					</div>

					<div class="input-group">
						<label for="amount">Amount</label>
						<div class="input-with-unit">
							<input
								id="amount"
								name="amount"
								type="number"
								step="0.01"
								min="0"
								max={societyCredits}
								bind:value={transferAmount}
								required
							/>
							<span class="unit">credits</span>
						</div>
						<span class="input-hint">Maximum: {societyCredits.toFixed(2)}</span>
					</div>

					<button type="submit" class="btn btn--primary">Transfer Credits</button>
				</form>
			{/if}
		</div>

		<div class="transfer-card card-border" style="margin-top: var(--space-4);">
			<p class="transfer-description">
				Send federation credits from the treasury to any principal
			</p>

			<Alert
				type="success"
				message={form?.federationTransferSuccess
					? `Submitted — ${form.amount.toFixed(2)} fed credits to ${form.toPrincipal}`
					: null}
			/>
			<Alert type="error" message={form?.federationTransferError ?? null} />

			{#if hasPermission(permissions, PERMISSION.TREASURY_TRANSFER)}
				<form method="POST" action="?/transferFederationCredits" use:enhance class="transfer-form">
					<div class="input-group">
						<label for="fed-to-principal">Recipient principal</label>
						<input
							id="fed-to-principal"
							name="toPrincipal"
							type="text"
							placeholder="handle@society"
							required
						/>
					</div>

					<div class="input-group">
						<label for="fed-amount">Amount</label>
						<div class="input-with-unit">
							<input
								id="fed-amount"
								name="amount"
								type="number"
								step="0.01"
								min="0.01"
								required
							/>
							<span class="unit">fed credits</span>
						</div>
					</div>

					<button type="submit" class="btn btn--primary">Send Federation Credits</button>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.transfer-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.transfer-card {
		padding: var(--space-5);
	}

	.transfer-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5) 0;
	}

	.transfer-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
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
</style>
