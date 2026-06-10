<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		confirmLabel = 'Confirm?',
		timeout = 3000,
		class: className = '',
		children,
		...rest
	}: {
		confirmLabel?: string;
		timeout?: number;
		class?: string;
		children: Snippet;
		[key: string]: unknown;
	} = $props();

	let confirming = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function reset() {
		confirming = false;
		if (timer) { clearTimeout(timer); timer = null; }
	}

	function handleClick(e: MouseEvent) {
		if (!confirming) {
			e.preventDefault();
			confirming = true;
			timer = setTimeout(reset, timeout);
		} else {
			reset();
			// fall through — form submits naturally
		}
	}

	$effect(() => () => { if (timer) clearTimeout(timer); });
</script>

<button
	{...rest}
	type="submit"
	class={className}
	class:confirming
	onclick={handleClick}
>
	{#if confirming}
		{confirmLabel}
	{:else}
		{@render children()}
	{/if}
</button>

<style>
	.confirming {
		background: var(--danger) !important;
		border-color: var(--danger) !important;
		color: white !important;
		opacity: 1 !important;
	}
</style>
