<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { FoodNutrientRow } from '$lib/server/infra/repositories';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const nutrientValues = $derived.by(() => {
		const map = new Map<string, number>();
		for (const fn of data.foodNutrients as FoodNutrientRow[]) {
			map.set(fn.nutrient_id, fn.per_100g);
		}
		return map;
	});

	function val(nutrientId: string): number {
		return nutrientValues.get(nutrientId) ?? 0;
	}
</script>

<div class="page-container">
	<div class="page-header">
		<a href="/society/nutrition" class="back-link">← Nutrition</a>
		<h1 class="t-display">{data.food.name}</h1>
		<p class="page-header-description">Nutrient values per 100g</p>
	</div>

	{#if form?.saveSuccess}
		<p class="form-success">Saved.</p>
	{/if}

	<form method="POST" action="?/saveNutrients" use:enhance class="nutrients-form card-border">
		<div class="form-header">
			<span>Nutrient</span>
			<span>Unit</span>
			<span class="t-right">per 100g</span>
		</div>

		{#each data.nutrients as nutrient}
			<div class="form-row">
				<label class="nutrient-label" for="n_{nutrient.id}">{nutrient.name}</label>
				<span class="nutrient-unit">{nutrient.unit}</span>
				<input
					id="n_{nutrient.id}"
					name="n_{nutrient.id}"
					type="number"
					min="0"
					step="0.001"
					class="nutrient-input t-numeric"
					value={val(nutrient.id)}
				/>
			</div>
		{/each}

		<div class="form-footer">
			<button type="submit" class="btn btn--primary">Save</button>
		</div>
	</form>
</div>

<style>
	.page-container {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-6, 2rem);
	}

	.page-header {
		margin-bottom: var(--space-8, 3rem);
	}

	.back-link {
		display: inline-block;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-faint);
		text-decoration: none;
		margin-bottom: var(--space-3, 0.75rem);
	}

	.back-link:hover { color: var(--gold); }

	.page-header h1 {
		margin: 0 0 var(--space-2, 0.5rem) 0;
	}

	.page-header-description {
		margin: 0;
		font-size: var(--text-sm);
		font-family: var(--font-prose);
		color: var(--ink-mid);
	}

	.nutrients-form { overflow: hidden; }

	.form-header {
		display: grid;
		grid-template-columns: 1fr 80px 120px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 80px 120px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		border-bottom: 1px solid var(--border-faint);
		align-items: center;
	}

	.form-row:last-of-type { border-bottom: none; }

	.nutrient-label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
	}

	.nutrient-unit {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		color: var(--ink-faint);
	}

	.nutrient-input {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
		padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		text-align: right;
		width: 100%;
	}

	.t-right { text-align: right; }

	.form-footer {
		padding: var(--space-4, 1.25rem);
		background: var(--surface-dk);
		border-top: 1px solid var(--border-faint);
	}

	.form-success {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-4, 1rem);
	}
</style>
