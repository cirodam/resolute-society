<script lang="ts">
	import { governanceTabs, treasuryTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';

	let { children } = $props();
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Treasury</h1>
		<p class="page-header-description">Money supply, inflows, and outflows</p>
	</div>

	<Subnav tabs={governanceTabs} />
	<Subnav tabs={treasuryTabs} />

	<div class="page-content">
		{@render children()}
	</div>
</div>
