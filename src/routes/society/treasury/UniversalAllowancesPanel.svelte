<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/Alert.svelte';
	import { hasPermission } from '$lib/client/permissions';

	type Permissions = { isFounder: boolean; codes: string[] };

	let {
		memberCount,
		permissions,
		form = null
	}: {
		memberCount: number;
		permissions: Permissions | undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	let expanded = $state(false);
	let universalAmount = $state(0);

	const preview = $derived(() => {
		if (memberCount === 0) return 'No members in society';
		const total = memberCount * universalAmount;
		return `${memberCount} ${memberCount === 1 ? 'member' : 'members'} · ${total.toFixed(2)} credits total`;
	});
</script>

<div class="universal-section">
	<button class="section-header-numbered" onclick={() => (expanded = !expanded)} type="button">
		<span class="section-number">1</span>
		<div class="section-header-text">
			<h2 class="section-title">Universal Allowances</h2>
			<p class="section-subtitle">Distribute equal amount to all members</p>
		</div>
		<span class="chevron" class:expanded>▼</span>
	</button>

	{#if expanded}
		<Alert
			type="success"
			message={form?.universalAllowanceSuccess
				? `Distributed ${form.amountPerMember.toFixed(2)} credits to ${form.memberCount} ${form.memberCount === 1 ? 'member' : 'members'} (${form.totalAmount.toFixed(2)} total)`
				: null}
		/>
		<Alert type="error" message={form?.universalAllowanceError ?? null} />

		<div class="universal-form card-border">
			{#if hasPermission(permissions, 'treasury.distribute_universal_allowance')}
				<form method="POST" action="?/distributeUniversalAllowance" use:enhance>
					<div class="form-row-inline">
						<div class="input-group-inline">
							<label for="universal-amount">Amount per member</label>
							<div class="input-with-unit">
								<input
									id="universal-amount"
									name="amount"
									type="number"
									bind:value={universalAmount}
									step="0.01"
									min="0"
									required
								/>
								<span class="unit">credits</span>
							</div>
							<span class="input-hint">{preview()}</span>
						</div>
						<button type="submit" class="btn btn--primary">Distribute to All Members</button>
					</div>
				</form>
			{/if}
		</div>
	{/if}
</div>

<style>
	.universal-section {
		margin-bottom: var(--space-8);
	}

	.universal-form {
		padding: var(--space-5);
		background: var(--surface);
	}

	.form-row-inline {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);
	}

	.input-group-inline {
		flex: 1;
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
