<script lang="ts">
	import { page } from '$app/stores';
	import type { NavTab } from '$lib/client/navigation';

	interface Props {
		tabs: NavTab[];
		activeTab?: string;
		onTabClick?: (label: string) => void;
	}

	let { tabs, activeTab, onTabClick }: Props = $props();

	const currentPath = $derived($page.url.pathname);

	function isActive(tab: NavTab): boolean {
		if (activeTab !== undefined) return tab.label === activeTab;
		return currentPath === tab.href || (!tab.exact && tab.href != null && currentPath.startsWith(tab.href + '/'));
	}
</script>

<nav class="subnav">
	{#each tabs as tab}
		{#if onTabClick}
			<button
				class="subnav__link"
				class:subnav__link--active={isActive(tab)}
				onclick={() => onTabClick(tab.label)}
			>
				{tab.label}
			</button>
		{:else}
			<a
				href={tab.href}
				class="subnav__link"
				class:subnav__link--active={isActive(tab)}
			>
				{tab.label}
			</a>
		{/if}
	{/each}
</nav>

<style>
	.subnav {
		display: flex;
		gap: var(--space-2, 0.5rem);
		border-bottom: 1px solid var(--border-subtle);
		margin-bottom: var(--space-6, 2rem);
	}

	.subnav__link {
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		text-decoration: none;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--ink-mid);
		cursor: pointer;
		font: inherit;
		transition: border-color 0.15s, color 0.15s;
	}

	.subnav__link:hover {
		color: var(--gold-hover);
	}

	.subnav__link--active {
		border-bottom-color: var(--gold);
		color: var(--gold);
	}
</style>
