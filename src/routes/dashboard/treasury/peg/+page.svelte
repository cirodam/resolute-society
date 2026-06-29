<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const config = $derived(data.config);
	const latest = $derived(data.latest);

	const impliedRate = $derived(() => {
		if (!config.creditsPerItem || !latest) return null;
		const priceUsd = latest.price_cents / 100;
		return priceUsd / config.creditsPerItem;
	});

	const today = new Date().toISOString().slice(0, 10);
</script>

<div class="peg-page">

	{#if !config.itemName || !config.creditsPerItem}
		<div class="notice card-border">
			<p>No credit peg configured. Set a reference item below to establish purchasing power.</p>
		</div>
	{:else}
		<div class="rate-section">
			<div class="rate-card card-border-accent">
				<div class="rate-equation">
					<span class="rate-part t-numeric">{Number.isInteger(config.creditsPerItem) ? config.creditsPerItem : config.creditsPerItem.toFixed(2)} SC</span>
					<span class="rate-eq">=</span>
					<span class="rate-part t-numeric">1 {config.itemName}</span>
					{#if latest}
						<span class="rate-eq">=</span>
						<span class="rate-part t-numeric">${(latest.price_cents / 100).toFixed(2)}</span>
					{/if}
				</div>
				{#if impliedRate()}
					<div class="implied-rate">
						1 SC ≈ ${impliedRate()!.toFixed(4)}
					</div>
				{/if}
				{#if latest}
					<div class="rate-meta">
						Last checked {latest.observed_on}{latest.store_name ? ` at ${latest.store_name}` : ''}{latest.recorded_by_name ? ` by ${latest.recorded_by_name}` : ''}
					</div>
				{:else}
					<div class="rate-meta">No price observations yet. Log one below.</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="log-section">
		<h2 class="section-title">Log a Price Check</h2>
		<p class="section-description">
			{#if config.itemName}
				Go to a store, find a <strong>{config.itemName}</strong>, and record what it costs.
			{:else}
				Configure a reference item first, then log what it costs at a store.
			{/if}
		</p>

		<Alert type="success" message={form?.success ? 'Price observation logged.' : null} />
		<Alert type="error" message={form?.error} />

		<div class="log-card card-border">
			<form method="POST" action="?/logObservation" use:enhance class="log-form">
				<div class="form-row">
					<div class="form-group">
						<label for="observed_on">Date</label>
						<input id="observed_on" name="observed_on" type="date" value={today} required />
					</div>
					<div class="form-group">
						<label for="price">Price (dollars)</label>
						<div class="input-with-unit">
							<span class="unit-prefix">$</span>
							<input
								id="price"
								name="price"
								type="number"
								step="0.01"
								min="0.01"
								placeholder="0.89"
								required
							/>
						</div>
					</div>
				</div>
				<div class="form-group">
					<label for="store_name">Store (optional)</label>
					<input id="store_name" name="store_name" type="text" placeholder="e.g. Corner Market" />
				</div>
				<button type="submit" class="btn btn--primary">Log Observation</button>
			</form>
		</div>
	</div>

	<div class="config-section">
		<h2 class="section-title">Peg Configuration</h2>
		<p class="section-description">Choose a reference item and how many society credits it costs in your economy.</p>

		<Alert type="success" message={form?.configSuccess ? 'Peg configuration saved.' : null} />
		<Alert type="error" message={form?.configError} />

		<div class="config-card card-border">
			<form method="POST" action="?/savePegConfig" use:enhance class="config-form">
				<div class="form-row">
					<div class="form-group">
						<label for="item_name">Reference Item</label>
						<input
							id="item_name"
							name="item_name"
							type="text"
							value={config.itemName ?? ''}
							placeholder="e.g. apple"
							required
						/>
						<span class="input-hint">A common, stable item you can find at any store</span>
					</div>
					<div class="form-group">
						<label for="credits_per_item">Society Credits per Item</label>
						<input
							id="credits_per_item"
							name="credits_per_item"
							type="number"
							step="0.01"
							min="0.01"
							value={config.creditsPerItem ?? ''}
							placeholder="e.g. 0.5"
							required
						/>
						<span class="input-hint">How many SC does one {config.itemName ?? 'item'} cost in your market?</span>
					</div>
				</div>
				<button type="submit" class="btn btn--secondary">Save Configuration</button>
			</form>
		</div>
	</div>

	{#if data.observations.length > 0}
		<div class="history-section">
			<h2 class="section-title">Price History</h2>
			<table class="history-table">
				<thead>
					<tr>
						<th>Date</th>
						<th>Store</th>
						<th class="t-right">Price</th>
						<th class="t-right">Implied Rate</th>
						<th>Recorded by</th>
					</tr>
				</thead>
				<tbody>
					{#each data.observations as obs}
						{@const priceUsd = obs.price_cents / 100}
						{@const rate = config.creditsPerItem ? priceUsd / config.creditsPerItem : null}
						<tr>
							<td>{obs.observed_on}</td>
							<td>{obs.store_name ?? '—'}</td>
							<td class="t-right t-numeric">${priceUsd.toFixed(2)}</td>
							<td class="t-right t-numeric">{rate !== null ? `$${rate.toFixed(4)}/SC` : '—'}</td>
							<td>{obs.recorded_by_name ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

</div>

<style>
	.peg-page {
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.notice {
		padding: var(--space-5);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.notice p {
		margin: 0;
	}

	.rate-card {
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.rate-equation {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.rate-part {
		font-size: var(--text-2xl);
		color: var(--ink);
	}

	.rate-eq {
		font-family: var(--font-label);
		font-size: var(--text-lg);
		color: var(--ink-mid);
	}

	.implied-rate {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.rate-meta {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.section-title {
		margin: 0 0 var(--space-2) 0;
	}

	.section-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-4) 0;
	}

	.log-card,
	.config-card {
		padding: var(--space-5);
		max-width: 600px;
	}

	.log-form,
	.config-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.input-with-unit {
		display: flex;
		align-items: center;
	}

	.unit-prefix {
		padding: 0 var(--space-2);
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		border: 1px solid var(--border);
		border-right: none;
		height: 100%;
		display: flex;
		align-items: center;
		background: var(--tint-green-mid);
	}

	.input-with-unit input {
		flex: 1;
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.history-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.history-table th {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ink-mid);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border);
		text-align: left;
	}

	.history-table td {
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-prose);
		color: var(--ink);
	}

	.t-right {
		text-align: right;
	}

	.t-numeric {
		font-family: var(--font-mono);
	}
</style>
