<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import SocietySidebar from '$lib/components/SocietySidebar.svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import '../theme.css';

	let { children, data } = $props();

	const currentPath = $derived($page.url.pathname);
	const isLoginPage = $derived(currentPath.startsWith('/login'));
	const isSocietyPage = $derived(currentPath.startsWith('/society'));
	const isPersonPage = $derived(currentPath.startsWith('/person'));
	const isAssociationPage = $derived(currentPath.startsWith('/association'));
	const isProfilePage = $derived(currentPath.startsWith('/profile'));
	// Set theme from server data immediately
	$effect(() => {
		if (browser && data.theme) {
			document.body.setAttribute('data-theme', data.theme);
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	{#if data.theme}
		<script>
			document.body.setAttribute('data-theme', '{data.theme}');
		</script>
	{/if}
</svelte:head>

{#if isLoginPage}
	{@render children()}
{:else if isSocietyPage || isPersonPage || isAssociationPage || isProfilePage}
	<SocietySidebar>
		{@render children()}
	</SocietySidebar>
{:else}
	{@render children()}
{/if}

