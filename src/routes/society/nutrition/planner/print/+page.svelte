<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, foods, nutrients, foodNutrients, requirements, printedAt } = $derived(data);

	function getNutrientValue(foodId: string, nutrientId: string): number | null {
		const entry = foodNutrients.find((fn) => fn.food_id === foodId && fn.nutrient_id === nutrientId);
		return entry ? entry.per_100g : null;
	}
</script>

<PrintToolbar backHref="/society/nutrition/planner" backLabel="← Nutrition Planner" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Community Nutrition Plan</div>
	</header>

	<section class="section">
		<div class="section-label">Population Daily Requirements</div>
		<table class="req-table">
			<thead>
				<tr>
					{#each requirements as req}
						<th>{req.name}<br><span class="unit">{req.unit}</span></th>
					{/each}
				</tr>
			</thead>
			<tbody>
				<tr>
					{#each requirements as req}
						<td>{req.total > 0 ? req.total.toLocaleString() : '—'}</td>
					{/each}
				</tr>
			</tbody>
		</table>
	</section>

	<section class="section">
		<div class="section-label">Food Inventory — Nutrients per 100g</div>
		{#if foods.length === 0}
			<p class="empty">No foods recorded.</p>
		{:else}
			<table class="food-table">
				<thead>
					<tr>
						<th class="col-food-name">Food</th>
						{#each nutrients as n}
							<th>{n.name}<br><span class="unit">{n.unit}</span></th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each foods as food}
						<tr>
							<td class="col-food-name">{food.name}</td>
							{#each nutrients as n}
								{@const val = getNutrientValue(food.id, n.id)}
								<td>{val !== null ? val : '—'}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<footer class="doc-footer">
		<span>{foods.length} foods · {society.name}</span>
		<span>Printed {formatLongDate(printedAt)}</span>
	</footer>
</div>

<style>
	.doc {
		max-width: 960px;
		margin: 2rem auto;
		padding: 2rem;
		background: white;
		color: #111;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 10pt;
		border: 1px solid #ccc;
	}

	.doc-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		border-bottom: 2px solid #111;
		padding-bottom: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.header-society { font-size: 13pt; font-weight: bold; }

	.header-title {
		font-size: 10pt;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #555;
	}

	.section { margin-bottom: 1.5rem; }

	.section-label {
		font-size: 9pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		border-bottom: 1px solid #ccc;
		padding-bottom: 0.2rem;
		margin-bottom: 0.5rem;
	}

	.req-table, .food-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 8.5pt;
	}

	.req-table th, .food-table th {
		font-size: 7.5pt;
		letter-spacing: 0.04em;
		color: #555;
		text-align: right;
		padding: 0.15rem 0.3rem;
		border-bottom: 1px solid #111;
		white-space: nowrap;
	}

	.req-table td, .food-table td {
		text-align: right;
		padding: 0.2rem 0.3rem;
		border-bottom: 1px solid #e8e8e8;
	}

	.col-food-name {
		text-align: left !important;
		font-weight: bold;
		white-space: nowrap;
	}

	.food-table tbody tr:nth-child(even) td { background: #f9f9f9; }

	.unit { font-size: 7pt; color: #888; font-weight: normal; }

	.empty { color: #888; font-style: italic; }

	.doc-footer {
		margin-top: 1rem;
		border-top: 1px solid #ccc;
		padding-top: 0.4rem;
		display: flex;
		justify-content: space-between;
		font-size: 8pt;
		color: #888;
		letter-spacing: 0.03em;
	}

	@media print {
		.doc {
			margin: 0;
			padding: 1cm 1.5cm;
			border: none;
			max-width: none;
		}

		@page { size: letter landscape; margin: 0; }
	}
</style>
