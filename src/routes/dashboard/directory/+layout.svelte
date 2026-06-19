<script lang="ts">
	import { directoryTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';

	let { children } = $props();
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Directory</h1>
		<p class="page-header-description">Members and associations</p>
	</div>

	<Subnav tabs={directoryTabs} />

	<div class="page-content">
		{@render children()}
	</div>
</div>

<style>
	/* page-header uses space-6 margin here (not global space-8) */
	.page-header {
		margin-bottom: var(--space-6);
	}
</style>
