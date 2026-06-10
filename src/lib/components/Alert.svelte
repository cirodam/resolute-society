<script lang="ts">
	let { type, message }: {
		type: 'success' | 'error';
		message?: string | null | false;
	} = $props();
</script>

{#if message}
	<div class="{type === 'success' ? 'success-message' : 'error-message'}">{message}</div>
{/if}
