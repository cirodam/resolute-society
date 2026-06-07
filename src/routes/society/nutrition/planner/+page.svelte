<script lang="ts">
	import { nutritionTabs } from '$lib/client/navigation';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';
	import type { FoodRow, FoodNutrientRow } from '$lib/server/infra/repositories';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let stock = $state<Record<string, number>>({});

	function stockKg(foodId: string): number {
		return stock[foodId] ?? 0;
	}

	const foodNutrientMap = $derived.by(() => {
		const map = new Map<string, Map<string, number>>();
		for (const fn of data.foodNutrients as FoodNutrientRow[]) {
			if (!map.has(fn.food_id)) map.set(fn.food_id, new Map());
			map.get(fn.food_id)!.set(fn.nutrient_id, fn.per_100g);
		}
		return map;
	});

	const availableTotals = $derived.by(() => {
		const totals = new Map<string, number>();
		for (const food of data.foods as FoodRow[]) {
			const kg = stockKg(food.id);
			if (kg <= 0) continue;
			const nutrients = foodNutrientMap.get(food.id);
			if (!nutrients) continue;
			for (const [nutrientId, per100g] of nutrients) {
				totals.set(nutrientId, (totals.get(nutrientId) ?? 0) + kg * 10 * per100g);
			}
		}
		return totals;
	});

	function daysFor(nutrientId: string, dailyRequired: number): number | null {
		if (dailyRequired <= 0) return null;
		const available = availableTotals.get(nutrientId) ?? 0;
		if (available <= 0) return null;
		return available / dailyRequired;
	}

	function fmtDays(days: number | null): string {
		if (days === null) return '—';
		if (days >= 999) return '999+ days';
		return Math.floor(days) + ' days';
	}

	function daysClass(days: number | null): string {
		if (days === null) return '';
		if (days >= 90) return 'met';
		if (days >= 30) return 'close';
		return 'low';
	}

	let addFoodName = $state('');

	function resetAdd() {
		addFoodName = '';
	}
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Nutrition</h1>
		<p class="page-header-description">
			Food planning for {data.society.name}
		</p>
	</div>

	<Subnav tabs={nutritionTabs} />

	<div class="page-content">

		<!-- Requirements + Planner -->
		<section>
			<h2 class="t-label section-label">Food Planner</h2>
			<p class="section-desc">
				Enter total stock on hand (kg) for each food. The planner shows how many days each
				nutrient requirement is covered given current inventory.
			</p>

			<div class="planner-layout">
				<!-- Food quantity inputs -->
				<div class="food-inputs card-border">
					<div class="food-inputs-header">
						<span>Food</span>
						<span class="t-right">kg on hand</span>
					</div>
					{#each data.foods as food}
						<div class="food-row">
							<a href="/society/nutrition/food/{food.id}" class="food-name">{food.name}</a>
							<input
								type="number"
								min="0"
								step="1"
								class="qty-input t-numeric"
								value={stockKg(food.id)}
								oninput={(e) => {
									const v = parseFloat((e.target as HTMLInputElement).value);
									stock[food.id] = isNaN(v) ? 0 : v;
								}}
							/>
						</div>
					{/each}
				</div>

				<!-- Nutrient coverage table -->
				<div class="coverage-table card-border">
					<div class="coverage-header">
						<span>Nutrient</span>
						<span class="t-right">Daily Need</span>
						<span class="t-right">On Hand</span>
						<span class="t-right">Days Covered</span>
					</div>
					{#each data.requirements as req}
						{@const days = daysFor(req.nutrient_id, req.total)}
						{@const onHand = availableTotals.get(req.nutrient_id) ?? 0}
						<div class="coverage-row">
							<span class="nutrient-name">{req.name}</span>
							<span class="t-numeric t-right req-val">
								{req.total.toLocaleString()} {req.unit}
							</span>
							<span class="t-numeric t-right req-val">
								{onHand > 0 ? Math.round(onHand).toLocaleString() + ' ' + req.unit : '—'}
							</span>
							<span class="coverage-pct {daysClass(days)}">{fmtDays(days)}</span>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- Food catalog -->
		<section>
			<h2 class="t-label section-label">Food Catalog</h2>
			<div class="food-catalog card-border">
				<div class="catalog-header">
					<span>Name</span>
					<span></span>
				</div>
				{#each data.foods as food}
					<div class="catalog-row">
						<a href="/society/nutrition/food/{food.id}" class="catalog-name">{food.name}</a>
						<form method="POST" action="?/deleteFood" use:enhance class="delete-form">
							<input type="hidden" name="food_id" value={food.id} />
							<button type="submit" class="btn-ghost btn-sm">Remove</button>
						</form>
					</div>
				{/each}

				<div class="catalog-add">
					{#if form?.addFoodError}
						<p class="form-error">{form.addFoodError}</p>
					{/if}
					<form
						method="POST"
						action="?/addFood"
						use:enhance={() => {
							return ({ result, update }) => {
								if (result.type === 'success') resetAdd();
								update();
							};
						}}
						class="add-form"
					>
						<input
							type="text"
							name="name"
							placeholder="New food name…"
							class="field-input"
							bind:value={addFoodName}
						/>
						<button type="submit" class="btn-secondary">Add Food</button>
					</form>
				</div>
			</div>
		</section>

	</div>
</div>

<style>
	.page-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-6, 2rem);
	}

	.page-header {
		margin-bottom: var(--space-8, 3rem);
	}

	.page-header h1 {
		margin: 0 0 var(--space-3, 0.75rem) 0;
	}

	.page-header-description {
		margin: 0;
		font-size: var(--text-base);
		font-family: var(--font-prose);
		color: var(--ink-mid);
	}

	.page-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-10, 4rem);
	}

	.section-label {
		margin: 0 0 var(--space-4, 1rem) 0;
	}

	.section-desc {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5, 1.5rem) 0;
	}

	/* Planner */
	.planner-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: var(--space-5, 1.5rem);
		align-items: start;
	}

	.food-inputs {
		display: flex;
		flex-direction: column;
	}

	.food-inputs-header {
		display: grid;
		grid-template-columns: 1fr 80px;
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

	.food-row {
		display: grid;
		grid-template-columns: 1fr 80px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-2, 0.5rem) var(--space-4, 1.25rem);
		border-bottom: 1px solid var(--border-faint);
		align-items: center;
	}

	.food-row:last-child { border-bottom: none; }

	.food-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
		text-decoration: none;
	}

	.food-name:hover { color: var(--gold); }

	.qty-input {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-sm);
		padding: var(--space-1, 0.25rem) var(--space-2, 0.5rem);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		text-align: right;
		width: 100%;
	}

	/* Coverage table */
	.coverage-table { overflow-x: auto; }

	.coverage-header,
	.coverage-row {
		display: grid;
		grid-template-columns: 1fr 160px 160px 120px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		align-items: center;
	}

	.coverage-header {
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.coverage-row {
		border-bottom: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.coverage-row:last-child { border-bottom: none; }

	.nutrient-name { color: var(--ink); }

	.req-val {
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.coverage-pct {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-align: right;
		font-weight: 600;
	}

	.coverage-pct.met   { color: var(--gold); }
	.coverage-pct.close { color: var(--ink-mid); }
	.coverage-pct.low   { color: var(--ink-faint); }

	.t-right { text-align: right; }

	/* Food catalog */
	.food-catalog { overflow: hidden; }

	.catalog-header {
		display: grid;
		grid-template-columns: 1fr 80px;
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

	.catalog-row {
		display: grid;
		grid-template-columns: 1fr 80px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		border-bottom: 1px solid var(--border-faint);
		align-items: center;
	}

	.catalog-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
		text-decoration: none;
	}

	.catalog-name:hover { color: var(--gold); }

	.delete-form { display: flex; justify-content: flex-end; }

	.catalog-add {
		padding: var(--space-4, 1.25rem);
		border-top: 1px solid var(--border-faint);
		background: var(--surface-dk);
	}

	.add-form {
		display: flex;
		gap: var(--space-3, 0.75rem);
		align-items: center;
	}

	.field-input {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		flex: 1;
	}

	.btn-sm {
		padding: var(--space-1, 0.25rem) var(--space-3, 0.75rem);
		font-size: var(--text-xs);
	}

	.form-error {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--error, #b00);
		margin: 0 0 var(--space-3, 0.75rem);
	}
</style>
