<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import { formatPrice } from '$lib/client/market';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('Listing');
	const tabs = $derived(
		data.isOwner && data.listing.status === 'active'
			? [{ label: 'Listing' }, { label: 'Edit' }]
			: [{ label: 'Listing' }]
	);

	const ITEM_CATEGORIES = [
		'Food & Provisions', 'Seeds & Plants', 'Tools & Equipment', 'Medical & First Aid',
		'Fuel & Energy', 'Building Materials', 'Clothing & Textiles', 'Livestock & Animals',
		'Books & Reference', 'Household Goods', 'Electronics & Comms', 'Vehicles & Parts'
	];


</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/dashboard/market" class="breadcrumb-link">Market</a>
			<span class="breadcrumb-sep">/</span>
			<span>Item</span>
		</div>
		<div class="title-row">
			<h1 class="t-display">{data.listing.title}</h1>
			<span class="type-badge type-badge--{data.listing.type}">
				{data.listing.type === 'offer' ? 'For Sale' : 'Wanted'}
			</span>
			{#if data.listing.status !== 'active'}
				<span class="status-badge status-badge--{data.listing.status}">
					{data.listing.status === 'sold' ? 'Sold' : 'Closed'}
				</span>
			{/if}
		</div>
		{#if data.listing.category}
			<p class="category-label">{data.listing.category}</p>
		{/if}
	</div>

	<Subnav {tabs} {activeTab} onTabClick={(t) => (activeTab = t)} />

	{#if activeTab === 'Listing'}
		<div class="listing-view">
			<div class="listing-body">
				<p class="listing-description">{data.listing.description}</p>
			</div>

			<div class="listing-meta">
				<div class="meta-row">
					<span class="meta-label">Price</span>
					<span class="meta-value price">
						{formatPrice(data.listing.society_credits_price, data.listing.federation_credits_price)}
					</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Listed by</span>
					<a href="/person/{data.listing.person_id}" class="meta-value meta-link">
						{data.listing.given_name} {data.listing.surname}
					</a>
				</div>
				<div class="meta-row">
					<span class="meta-label">Posted</span>
					<span class="meta-value">{formatLongDate(data.listing.created_at)}</span>
				</div>
			</div>

			{#if data.isOwner && data.listing.status === 'active'}
				<div class="owner-actions">
					{#if data.listing.type === 'offer'}
						<form method="POST" action="?/markSold" use:enhance>
							<ConfirmButton class="btn btn--primary">Mark as Sold</ConfirmButton>
						</form>
					{/if}
					<form method="POST" action="?/close" use:enhance>
						<ConfirmButton class="btn btn--secondary">Close Listing</ConfirmButton>
					</form>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'Edit'}
		<div class="edit-view">
			<form method="POST" action="?/update" use:enhance class="edit-form"
				onsubmit={() => (activeTab = 'Listing')}>
				<div class="form-group">
					<label for="edit-title">Title</label>
					<input type="text" id="edit-title" name="title" required class="input"
						value={data.listing.title} />
				</div>
				<div class="form-group">
					<label for="edit-category">Category</label>
					<select id="edit-category" name="category" class="select">
						<option value="">— Select —</option>
						{#each ITEM_CATEGORIES as cat}
							<option value={cat} selected={data.listing.category === cat}>{cat}</option>
						{/each}
					</select>
				</div>
				<div class="form-group">
					<label for="edit-description">Description</label>
					<textarea id="edit-description" name="description" required class="textarea" rows="5"
					>{data.listing.description}</textarea>
				</div>
				<div class="form-row">
					<div class="form-group">
						<label for="edit-society-price">Society Credits</label>
						<input type="number" id="edit-society-price" name="society_credits_price"
							step="0.01" class="input" placeholder="Optional"
							value={data.listing.society_credits_price ?? ''} />
					</div>
					<div class="form-group">
						<label for="edit-federation-price">Federation Credits</label>
						<input type="number" id="edit-federation-price" name="federation_credits_price"
							step="0.01" class="input" placeholder="Optional"
							value={data.listing.federation_credits_price ?? ''} />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn--primary">Save Changes</button>
					<button type="button" class="btn btn--secondary" onclick={() => (activeTab = 'Listing')}>Cancel</button>
				</div>
			</form>
		</div>
	{/if}
</div>

<style>
	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.type-badge, .status-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.type-badge--offer { background: var(--tint-green); color: var(--ink-mid); }
	.type-badge--wanted { background: var(--tint-gold); color: var(--gold); }
	.status-badge--sold, .status-badge--closed { background: var(--surface-dk); color: var(--ink-faint); }

	.category-label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: var(--space-2) 0 0;
	}

	.listing-view {
		max-width: 680px;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	.listing-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.8;
		color: var(--ink);
		margin: 0;
		white-space: pre-wrap;
	}

	.listing-meta {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-5);
		border: 1px solid var(--border-faint);
		background: var(--surface-dk);
	}

	.meta-row {
		display: flex;
		gap: var(--space-4);
		align-items: baseline;
	}

	.meta-label {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--ink-faint);
		width: 6rem;
		flex-shrink: 0;
	}

	.meta-value {
		font-family: var(--font-prose);
		font-size: var(--text-base);
	}

	.meta-value.price {
		font-weight: 600;
		color: var(--gold);
	}

	.meta-link {
		text-decoration: none;
		color: inherit;
	}

	.meta-link:hover { color: var(--gold); }

	.owner-actions {
		display: flex;
		gap: var(--space-3);
	}

	.edit-view { max-width: 640px; }

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.edit-form .form-group label {
		display: block;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.input, .select, .textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.textarea { resize: vertical; }

	.form-actions { display: flex; gap: var(--space-3); }
</style>
