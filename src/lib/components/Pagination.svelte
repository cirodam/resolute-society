<script lang="ts">
	let {
		page,
		totalPages,
		buildHref,
		label = 'Page'
	}: {
		page: number;
		totalPages: number;
		buildHref: (page: number) => string;
		label?: string;
	} = $props();
</script>

{#if totalPages > 1}
	<div class="pagination">
		{#if page > 1}
			<a href={buildHref(page - 1)} class="btn btn--secondary btn--small">Previous</a>
		{:else}
			<span class="btn btn--secondary btn--small btn--disabled">Previous</span>
		{/if}
		<span class="page-indicator">{label} {page} of {totalPages}</span>
		{#if page < totalPages}
			<a href={buildHref(page + 1)} class="btn btn--secondary btn--small">Next</a>
		{:else}
			<span class="btn btn--secondary btn--small btn--disabled">Next</span>
		{/if}
	</div>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		padding: var(--space-4) 0;
	}

	.page-indicator {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}
</style>
