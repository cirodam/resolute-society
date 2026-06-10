<script lang="ts">
	interface Props {
		backHref: string;
		backLabel?: string;
	}

	let { backHref, backLabel = '← Back' }: Props = $props();
</script>

<div class="toolbar no-print">
	<a href={backHref} class="back-link">{backLabel}</a>
	<button onclick={() => window.print()} class="print-btn">Print</button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--border);
		background: var(--surface-dk);
	}

	.back-link {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--ink-mid);
		text-decoration: none;
	}

	.back-link:hover {
		color: var(--ink-base);
	}

	.print-btn {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}

	.print-btn:hover {
		background: var(--tint-gold);
	}
</style>
