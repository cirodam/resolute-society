<script lang="ts">
	interface Tab {
		value: string;
		label: string;
		badge?: number;
	}
	let { tabs, active, onchange }: {
		tabs: Tab[];
		active: string;
		onchange: (value: string) => void;
	} = $props();
</script>

<div class="tabs">
	{#each tabs as tab}
		<button
			class="tab"
			class:tab--active={active === tab.value}
			onclick={() => onchange(tab.value)}
		>
			{tab.label}{#if tab.badge}<span class="tab-badge">{tab.badge}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		border-bottom: 2px solid var(--border);
		margin-bottom: var(--space-6);
	}

	.tab {
		padding: var(--space-3) var(--space-5);
		margin-right: var(--space-4);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -2px;
		cursor: pointer;
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
		color: var(--ink-mid);
		transition: color 0.15s, border-color 0.15s;
	}

	.tab:hover { color: var(--ink); }

	.tab--active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.tab-badge {
		display: inline-block;
		background: var(--accent);
		color: white;
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: 10px;
		margin-left: var(--space-1);
	}
</style>
