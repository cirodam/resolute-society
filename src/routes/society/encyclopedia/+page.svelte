<script lang="ts">
	import { knowledgeTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display">Encyclopedia</h1>
		<p class="page-header-description">
			Reference pages for shared practices, standards, and local knowledge.
		</p>
	</div>

	<Subnav tabs={knowledgeTabs} />

	<div class="page-content">
		{#if data.entries.length === 0}
			<section class="empty card-border">
				<p>No encyclopedia entries yet. Add Markdown files to src/lib/content/encyclopedia.</p>
			</section>
		{:else}
			{#each data.entryGroups as group}
				<section class="category-section">
					<h2 class="category-title">{group.category}</h2>
					<div class="entries-grid">
						{#each group.entries as entry}
							<a class="entry-card card-border" href="/society/encyclopedia/{entry.slug}">
								<h3>{entry.title}</h3>
								<p>{entry.summary}</p>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		{/if}
	</div>
</div>

<style>
	.empty {
		padding: var(--space-4);
	}

	.category-section {
		margin-bottom: var(--space-7);
	}

	.category-title {
		margin: 0 0 var(--space-3) 0;
		font-family: var(--font-prose);
		font-size: var(--text-xl);
		font-weight: 600;
		color: var(--ink);
	}

	.entries-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: var(--space-4);
	}

	.entry-card {
		display: block;
		padding: var(--space-4);
		text-decoration: none;
		color: inherit;
		background: var(--surface);
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
	}

	.entry-card:hover,
	.entry-card:focus-visible {
		transform: translateY(-2px);
		border-color: var(--ink-mid);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}

	.entry-card h3 {
		margin: 0 0 var(--space-2) 0;
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		color: var(--ink);
	}

	.entry-card p {
		margin: 0;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		line-height: 1.6;
		color: var(--ink-mid);
	}
</style>
