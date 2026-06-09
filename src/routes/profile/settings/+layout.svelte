<script lang="ts">
	import { settingsTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';

	let { children } = $props();
</script>

<div class="page-container page-container--narrow">
	<div class="page-header">
		<h1 class="t-display">Settings</h1>
	</div>

	<Subnav tabs={settingsTabs} />

	{@render children()}
</div>
