<script lang="ts">
	import { nutritionTabs } from '$lib/client/navigation';
	import type { PageData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Nutrition</h1>
		<p class="page-header-description">
			Nutritional requirements for {data.society.name}
		</p>
	</div>

	<Subnav tabs={nutritionTabs} />

	<div class="page-content">

		<!-- Demographics -->
		{#if data.demographics.length > 0}
			<section>
				<h2 class="t-label section-label">Population Demographics</h2>
				<div class="demo-grid card-border">
					{#each data.demographics as group}
						<div class="demo-item">
							<span class="demo-count">{group.count}</span>
							<span class="demo-label">{group.label}</span>
						</div>
					{/each}
				</div>
			</section>
		{:else}
			<section>
				<h2 class="t-label section-label">Population Demographics</h2>
				<div class="empty-state card-border">
					<p>No members or dependants found. Add people to the society to see requirements.</p>
				</div>
			</section>
		{/if}

		<!-- Requirements table -->
		<section>
			<h2 class="t-label section-label">Daily Requirements</h2>
			{#if data.requirements.length > 0}
				<div class="req-table card-border">
					<div class="req-header">
						<span>Nutrient</span>
						<span class="t-right">Daily Need</span>
					</div>
					{#each data.requirements as req}
						<div class="req-row">
							<span class="nutrient-name">{req.name}</span>
							<span class="t-numeric t-right req-val">
								{req.total.toLocaleString()} {req.unit}
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state card-border">
					<p>No nutrient requirements calculated. Add members to the society first.</p>
				</div>
			{/if}
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

	/* Demographics */
	.demo-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
	}

	.demo-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-4, 1.25rem) var(--space-6, 2rem);
		border-right: 1px solid var(--border-faint);
		gap: var(--space-1, 0.25rem);
	}

	.demo-item:last-child { border-right: none; }

	.demo-count {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		color: var(--ink);
	}

	.demo-label {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
		text-align: center;
	}

	/* Requirements table */
	.req-table { overflow: hidden; }

	.req-header,
	.req-row {
		display: grid;
		grid-template-columns: 1fr 200px;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		align-items: center;
	}

	.req-header {
		background: var(--surface-dk);
		border-bottom: 2px solid var(--border);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: var(--ink-mid);
	}

	.req-row {
		border-bottom: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.req-row:last-child { border-bottom: none; }

	.nutrient-name { color: var(--ink); }

	.req-val {
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.t-right { text-align: right; }

	.empty-state {
		padding: var(--space-8, 3rem);
		text-align: center;
		font-family: var(--font-prose);
		color: var(--ink-mid);
		font-style: italic;
	}
</style>
