<script lang="ts">
	import { page } from '$app/stores';
	import type { NavTab } from '$lib/client/navigation';

	let { tabs }: { tabs: NavTab[] } = $props();

	const currentPath = $derived($page.url.pathname);
</script>

<nav class="subnav">
	{#each tabs as tab}
		<a
			href={tab.href}
			class="subnav__link"
			class:subnav__link--active={currentPath === tab.href || currentPath.startsWith(tab.href + '/')}
		>
			{tab.label}
		</a>
	{/each}
</nav>

<style>
	.subnav {
		display: flex;
		gap: var(--space-2, 0.5rem);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		margin-bottom: var(--space-6, 2rem);
	}

	.subnav__link {
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		transition: border-color 0.15s, color 0.15s;
	}

	.subnav__link:hover {
		color: rgba(255, 255, 255, 0.9);
	}

	.subnav__link--active {
		border-bottom-color: currentColor;
		color: rgba(255, 255, 255, 1);
	}
</style>
