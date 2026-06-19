<script lang="ts">
	import { PERMISSION } from '$lib/permissions';
	import { enhance } from '$app/forms';
	import { hasPermission } from '$lib/client/permissions';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

<div class="demurrage-section">
	<h2 class="section-title">Demurrage</h2>
	<p class="section-description">Collect society credits from all members and associations to the treasury.</p>

	<Alert type="success" message={form?.success ? `Collected ${form.collected.toFixed(2)} credits from ${form.principalCount} principals` : null} />
	<Alert type="error" message={form?.error} />

	{#if hasPermission(data.permissions, PERMISSION.TREASURY_RUN_DEMURRAGE)}
		<div class="demurrage-card card-border">
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
		</div>
	{/if}
</div>

<style>
	.demurrage-section {
		max-width: 560px;
	}

	.section-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5) 0;
	}

	.demurrage-card {
		padding: var(--space-5);
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
</style>
