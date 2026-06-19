<script lang="ts">
	import { knowledgeTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="page-container page-container--content">
	<div class="page-header page-header--left">
		<h1 class="t-display">{data.entry.title}</h1>
		<p class="page-header-description">{data.entry.summary}</p>
	</div>

	<Subnav tabs={knowledgeTabs} />

	<div class="page-content">
		<article class="entry-content card-border">
			{@html data.entry.html}
		</article>
	</div>
</div>

<style>
	.page-header--left {
		text-align: left;
	}

	.entry-content {
		padding: var(--space-6);
		background: var(--surface);
	}

	.entry-content :global(h1),
	.entry-content :global(h2),
	.entry-content :global(h3) {
		font-family: var(--font-prose);
		color: var(--ink);
		margin-top: var(--space-6);
		margin-bottom: var(--space-3);
	}

	.entry-content :global(h1:first-child),
	.entry-content :global(h2:first-child),
	.entry-content :global(h3:first-child) {
		margin-top: 0;
	}

	.entry-content :global(p),
	.entry-content :global(li),
	.entry-content :global(blockquote) {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.75;
		color: var(--ink);
	}

	.entry-content :global(ul),
	.entry-content :global(ol) {
		padding-left: 1.4rem;
		margin: var(--space-3) 0;
	}

	.entry-content :global(code) {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		background: color-mix(in srgb, var(--surface-muted) 85%, white 15%);
		padding: 0.12rem 0.3rem;
		border-radius: 3px;
	}

	.entry-content :global(pre) {
		overflow-x: auto;
		padding: var(--space-3);
		border: 1px solid var(--border-subtle);
		background: var(--surface-muted);
	}

	.entry-content :global(a) {
		color: var(--ink-link, #2d5f8b);
	}
</style>
