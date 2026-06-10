<script lang="ts">
	let { message, card = false }: { message: string; card?: boolean } = $props();
</script>

{#if card}
	<div class="empty-state card-border"><p>{message}</p></div>
{:else}
	<p class="empty-state">{message}</p>
{/if}
