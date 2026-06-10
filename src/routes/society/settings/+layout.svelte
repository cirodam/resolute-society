<script lang="ts">
	import { societySettingsTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';

	let { children } = $props();
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display">Society Settings</h1>
	</div>

	<Subnav tabs={societySettingsTabs} />

	{@render children()}
</div>
