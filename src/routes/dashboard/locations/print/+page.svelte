<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, locations, printedAt } = $derived(data);

	const byCategory = $derived(() => {
		const map = new Map<string, typeof locations>();
		for (const loc of locations) {
			const key = loc.category?.name ?? 'Uncategorized';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(loc);
		}
		return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
	});
</script>

<PrintToolbar backHref="/dashboard/locations" backLabel="← Locations" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Location Directory</div>
	</header>

	{#if locations.length === 0}
		<p class="empty">No locations recorded.</p>
	{:else}
		{#each byCategory() as [category, locs]}
			<div class="category-section">
				<div class="category-label">{category}</div>
				{#each locs as loc}
					<div class="location-row">
						<div class="location-name">{loc.name}</div>
						{#if loc.address}
							<div class="location-address">{loc.address}</div>
						{/if}
						{#if loc.lat && loc.lng}
							<div class="location-coords">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</div>
						{/if}
						{#if loc.notes}
							<div class="location-notes">{loc.notes}</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	{/if}

	<footer class="doc-footer">
		<span>{locations.length} locations · {society.name}</span>
		<span>Printed {formatLongDate(printedAt)}</span>
	</footer>
</div>

<style>
	.doc {
		max-width: 760px;
		margin: 2rem auto;
		padding: 2rem;
		background: white;
		color: #111;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 11pt;
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

	.category-section {
		margin-bottom: 1.25rem;
	}

	.category-label {
		font-size: 9pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		border-bottom: 1px solid #ccc;
		padding-bottom: 0.2rem;
		margin-bottom: 0.5rem;
	}

	.location-row {
		padding: 0.3rem 0;
		border-bottom: 1px solid #f0f0f0;
	}

	.location-name { font-weight: bold; font-size: 11pt; }

	.location-address, .location-coords {
		font-size: 9pt;
		color: #444;
	}

	.location-coords { font-family: 'Courier New', monospace; }

	.location-notes {
		font-size: 9pt;
		color: #666;
		font-style: italic;
		margin-top: 0.15rem;
	}

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
			padding: 1.5cm 2cm;
			border: none;
			max-width: none;
		}

		@page { size: letter portrait; margin: 0; }
	}
</style>
