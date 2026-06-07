<script lang="ts">
	import type { PageData } from './$types';
	import { hasPermission } from '$lib/client/permissions';

	let { data }: { data: PageData } = $props();
</script>

<section class="directory-section">
	<div class="section-header">
		<h2 class="section-title">Associations ({data.associations.length})</h2>
		{#if hasPermission(data.permissions, 'membership.create_association')}
			<a href="/society/directory/new-association" class="btn btn--secondary">
				Add Association
			</a>
		{/if}
	</div>

	<form method="GET" class="search-form card-border">
		<label for="association_q">Search Associations</label>
		<div class="search-row">
			<input
				id="association_q"
				name="association_q"
				type="search"
				value={data.associationQuery}
				placeholder="Name, handle, or type"
				class="input"
			/>
			<button type="submit" class="btn btn--secondary btn--small">Search</button>
		</div>
	</form>

	{#if data.associations.length === 0}
		<p class="empty-state">No associations match this search.</p>
	{:else}
		<div class="items-grid">
			{#each data.associations as association}
				<a href="/association/{association.id}" class="association-card card-border">
					<div class="association-header">
						<h3 class="association-name">{association.name}</h3>
						{#if association.special_type !== 'none'}
							<span class="association-type t-label">{association.special_type === 'college' ? 'College' : 'Hub'}</span>
						{/if}
						{#if association.type}
							<span class="association-type t-label">{association.type}</span>
						{/if}
					</div>
					<p class="association-handle">{association.handle}</p>
					{#if association.description}
						<p class="association-description">{association.description}</p>
					{/if}
				</a>
			{/each}
		</div>
	{/if}
</section>

<style>
	.directory-section {
		margin-bottom: var(--space-8);
	}

	.search-form {
		padding: var(--space-4);
		margin-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.search-form label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.search-row {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.input {
		flex: 1;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.association-card {
		padding: var(--space-4);
		display: block;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.association-card:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.association-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.association-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
	}

	.association-type {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.association-handle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.association-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		line-height: 1.5;
		color: var(--ink-mid);
		margin: var(--space-2) 0 0;
	}
</style>
