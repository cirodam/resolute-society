<script lang="ts">
	import { knowledgeTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let groupByCategory = $state(false);

	const sorted = $derived(
		[...data.entries].sort((a, b) => a.title.localeCompare(b.title))
	);

	const grouped = $derived(() => {
		const map = new Map<string, typeof sorted>();
		for (const entry of sorted) {
			const bucket = map.get(entry.category) ?? [];
			bucket.push(entry);
			map.set(entry.category, bucket);
		}
		return [...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([category, entries]) => ({ category, entries }));
	});
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display">Encyclopedia</h1>
		<p class="page-header-description">
			Reference pages for shared practices, standards, and local knowledge.
		</p>
	</div>

	<Subnav tabs={knowledgeTabs} />

	{#if data.entries.length === 0}
		<div class="empty card-border card-body">
			<p>No encyclopedia entries yet. Add Markdown files to src/lib/content/encyclopedia.</p>
		</div>
	{:else}
		<div class="list-controls">
			<button
				class="btn btn--small"
				class:btn--primary={groupByCategory}
				onclick={() => (groupByCategory = !groupByCategory)}
			>
				{groupByCategory ? 'A–Z' : 'By Category'}
			</button>
		</div>

		{#if groupByCategory}
			{#each grouped() as group}
				<section class="category-section">
					<h2 class="category-heading">{group.category}</h2>
					<div class="entries-list card-border">
						{#each group.entries as entry}
							<a class="entry-card" href="/society/encyclopedia/{entry.slug}">
								<span class="entry-title">{entry.title}</span>
								<span class="entry-summary">{entry.summary}</span>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		{:else}
			<div class="entries-list card-border">
				{#each sorted as entry}
					<a class="entry-card" href="/society/encyclopedia/{entry.slug}">
						<span class="entry-title">{entry.title}</span>
						<span class="entry-summary">{entry.summary}</span>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.list-controls {
		display: flex;
		justify-content: flex-end;
		margin-bottom: var(--space-4);
	}

	.category-section {
		margin-bottom: var(--space-7);
	}

	.category-heading {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.18em;
		color: var(--ink-mid);
		margin: 0 0 var(--space-3) 0;
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-subtle);
	}

	.entries-list {
		display: flex;
		flex-direction: column;
	}

	.entry-card {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		min-height: 3.5rem;
		text-decoration: none;
		color: inherit;
		border-bottom: 1px solid var(--border-subtle);
		transition: background 0.12s;
	}

	.entry-card:last-child {
		border-bottom: none;
	}

	.entry-card:hover {
		background: var(--tint-gold);
	}

	.entry-title {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink);
		min-width: 13rem;
		max-width: 16rem;
		flex-shrink: 0;
	}

	.entry-summary {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		line-height: 1.5;
	}
</style>
