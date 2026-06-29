<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatShortDate } from '$lib/client/datetime';
	import { formatPrice, formatRate, formatDollarEquivalent } from '$lib/client/market';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import Subnav from '$lib/components/Subnav.svelte';
	import type { NavTab } from '$lib/client/navigation';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('Items');
	const tabs: NavTab[] = [{ label: 'Items' }, { label: 'Services' }, { label: 'My Listings' }];

	const ITEM_CATEGORIES = [
		'Food & Provisions',
		'Seeds & Plants',
		'Tools & Equipment',
		'Medical & First Aid',
		'Fuel & Energy',
		'Building Materials',
		'Clothing & Textiles',
		'Livestock & Animals',
		'Books & Reference',
		'Household Goods',
		'Electronics & Comms',
		'Vehicles & Parts'
	];

	const SERVICE_CATEGORIES = [
		'Medical & Health',
		'Construction & Repair',
		'Farming & Gardening',
		'Education & Training',
		'Food Preparation',
		'Animal Care',
		'Transportation',
		'Security',
		'Crafts & Manufacturing',
		'Technical & Mechanical',
		'Legal & Administrative',
		'Childcare & Care'
	];

	let itemMode = $state<'offer' | 'wanted'>('offer');
	let itemSearch = $state('');
	let serviceSearch = $state('');
	let showItemForm = $state(false);
	let showServiceForm = $state(false);

	function setItemMode(mode: 'offer' | 'wanted') {
		itemMode = mode;
		showItemForm = false;
	}

	const filteredItems = $derived(
		data.itemListings
			.filter((item) => item.type === itemMode)
			.filter((item) => {
				const q = itemSearch.trim().toLowerCase();
				if (!q) return true;
				return (
					item.title.toLowerCase().includes(q) ||
					item.description.toLowerCase().includes(q) ||
					(item.category?.toLowerCase().includes(q) ?? false)
				);
			})
	);

	const filteredServices = $derived(
		data.serviceListings.filter((service) => {
			const q = serviceSearch.trim().toLowerCase();
			if (!q) return true;
			return (
				service.title.toLowerCase().includes(q) ||
				service.description.toLowerCase().includes(q) ||
				(service.category?.toLowerCase().includes(q) ?? false)
			);
		})
	);
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Market</h1>
		<p class="page-header-description">
			Marketplace for {data.society.name}
		</p>
	</div>

	<div class="page-content">
		<Subnav {tabs} activeTab={activeTab} onTabClick={(label) => { activeTab = label; }} />

		{#if activeTab === 'Items'}
		<section class="market-section">
			<div class="items-toolbar">
				<input
					type="search"
					class="input search-input"
					placeholder="Search items..."
					bind:value={itemSearch}
				/>
				<div class="toggle-group">
					<button
						class="toggle-btn"
						class:toggle-btn--active={itemMode === 'offer'}
						onclick={() => setItemMode('offer')}
					>For Sale</button>
					<button
						class="toggle-btn"
						class:toggle-btn--active={itemMode === 'wanted'}
						onclick={() => setItemMode('wanted')}
					>Wanted</button>
				</div>
				<button class="btn btn--primary btn--small" onclick={() => showItemForm = !showItemForm}>
					{showItemForm ? 'Cancel' : itemMode === 'offer' ? '+ List Item' : '+ Request Item'}
				</button>
			</div>

			{#if showItemForm}
				<form method="POST" action="?/createItem" use:enhance class="listing-form card-border">
					<input type="hidden" name="type" value={itemMode} />
					<div class="form-group">
						<label for="item-title">Title</label>
						<input type="text" id="item-title" name="title" required class="input" />
					</div>
					<div class="form-group">
						<label for="item-category">Category</label>
						<select id="item-category" name="category" class="select">
							<option value="">— Select —</option>
							{#each ITEM_CATEGORIES as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="item-description">Description</label>
						<textarea id="item-description" name="description" required class="textarea" rows="3"></textarea>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="item-society-price">Society Credits</label>
							<input type="number" id="item-society-price" name="society_credits_price" step="0.01" class="input" placeholder="Optional" />
						</div>
						<div class="form-group">
							<label for="item-federation-price">Federation Credits</label>
							<input type="number" id="item-federation-price" name="federation_credits_price" step="0.01" class="input" placeholder="Optional (requires SC)" />
						</div>
					</div>
					{#if data.dollarPerCredit !== null}
						<label class="checkbox-label">
							<input type="checkbox" name="dollars_allowed" />
							Show dollar equivalent (inferred from credit peg)
						</label>
					{/if}
					<button type="submit" class="btn btn--primary">
						{itemMode === 'offer' ? 'Post Listing' : 'Post Request'}
					</button>
				</form>
			{/if}

			{#if filteredItems.length === 0 && !showItemForm}
				<EmptyState message={itemSearch ? 'No results.' : itemMode === 'offer' ? 'No items for sale yet.' : 'No wanted items yet.'} />
			{:else if !showItemForm}
				<div class="listings-grid">
					{#each filteredItems as item}
						<a href="/dashboard/market/item/{item.id}" class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{item.title}</h3>
								{#if item.category}
									<span class="listing-category t-label">{item.category}</span>
								{/if}
							</div>
							<p class="listing-description">{item.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatPrice(item.society_credits_price, item.federation_credits_price, true)}</span>
								{#if item.dollars_allowed && data.dollarPerCredit !== null && item.society_credits_price !== null}
									<span class="listing-dollar">{formatDollarEquivalent(item.society_credits_price, data.dollarPerCredit)}</span>
								{/if}
								<span class="listing-author">{item.given_name} {item.surname}</span>
								<span class="listing-date">{formatShortDate(item.created_at)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<Pagination
			page={data.itemPage}
			totalPages={data.itemTotalPages}
			buildHref={(p) => `?itemPage=${p}&servicePage=${data.servicePage}`}
			label="Items page"
		/>
		{/if}

		{#if activeTab === 'Services'}
		<section class="market-section">
			<div class="items-toolbar">
				<input
					type="search"
					class="input search-input"
					placeholder="Search services..."
					bind:value={serviceSearch}
				/>
				<button class="btn btn--primary btn--small" onclick={() => showServiceForm = !showServiceForm}>
					{showServiceForm ? 'Cancel' : '+ Offer Service'}
				</button>
			</div>

			{#if showServiceForm}
				<form method="POST" action="?/createService" use:enhance class="listing-form card-border">
					<div class="form-group">
						<label for="service-title">Service Title</label>
						<input type="text" id="service-title" name="title" required class="input" placeholder="e.g., Plumbing Services" />
					</div>
					<div class="form-group">
						<label for="service-category">Category</label>
						<select id="service-category" name="category" class="select">
							<option value="">— Select —</option>
							{#each SERVICE_CATEGORIES as cat}
								<option value={cat}>{cat}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="service-description">Description</label>
						<textarea id="service-description" name="description" required class="textarea" rows="3"></textarea>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="service-society-rate">Society Credits</label>
							<input type="number" id="service-society-rate" name="society_credits_rate" step="0.01" class="input" placeholder="Optional" />
						</div>
						<div class="form-group">
							<label for="service-federation-rate">Federation Credits</label>
							<input type="number" id="service-federation-rate" name="federation_credits_rate" step="0.01" class="input" placeholder="Optional (requires SC)" />
						</div>
						<div class="form-group">
							<label for="service-rate-unit">Per</label>
							<select id="service-rate-unit" name="rate_unit" class="select">
								<option value="">Negotiable</option>
								<option value="hour">Hour</option>
								<option value="day">Day</option>
								<option value="job">Job</option>
							</select>
						</div>
					</div>
					{#if data.dollarPerCredit !== null}
						<label class="checkbox-label">
							<input type="checkbox" name="dollars_allowed" />
							Show dollar equivalent (inferred from credit peg)
						</label>
					{/if}
					<button type="submit" class="btn btn--primary">Post Service</button>
				</form>
			{/if}

			{#if filteredServices.length === 0 && !showServiceForm}
				<EmptyState message={serviceSearch ? 'No results.' : 'No services offered yet.'} />
			{:else if !showServiceForm}
				<div class="listings-grid">
					{#each filteredServices as service}
						<a href="/dashboard/market/service/{service.id}" class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{service.title}</h3>
								{#if service.category}
									<span class="listing-category t-label">{service.category}</span>
								{/if}
							</div>
							<p class="listing-description">{service.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatRate(service.society_credits_rate, service.federation_credits_rate, service.rate_unit, true)}</span>
								{#if service.dollars_allowed && data.dollarPerCredit !== null && service.society_credits_rate !== null}
									<span class="listing-dollar">{formatDollarEquivalent(service.society_credits_rate, data.dollarPerCredit)}{service.rate_unit ? `/${service.rate_unit}` : ''}</span>
								{/if}
								<span class="listing-author">{service.given_name} {service.surname}</span>
								<span class="listing-date">{formatShortDate(service.created_at)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<Pagination
			page={data.servicePage}
			totalPages={data.serviceTotalPages}
			buildHref={(p) => `?itemPage=${data.itemPage}&servicePage=${p}`}
			label="Services page"
		/>
		{/if}

		{#if activeTab === 'My Listings'}
		<section class="market-section">
			<h2 class="section-title">Items</h2>
			{#if data.myItemListings.length === 0}
				<EmptyState message="You have no item listings." />
			{:else}
				<div class="listings-grid">
					{#each data.myItemListings as item}
						<a href="/dashboard/market/item/{item.id}" class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{item.title}</h3>
								<span class="listing-type t-label listing-type--{item.type}">
									{item.type === 'offer' ? 'For Sale' : 'Wanted'}
								</span>
							</div>
							{#if item.category}
								<span class="listing-category t-label">{item.category}</span>
							{/if}
							<p class="listing-description">{item.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatPrice(item.society_credits_price, item.federation_credits_price, true)}</span>
								<span class="listing-date">{formatShortDate(item.created_at)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<section class="market-section">
			<h2 class="section-title">Services</h2>
			{#if data.myServiceListings.length === 0}
				<EmptyState message="You have no service listings." />
			{:else}
				<div class="listings-grid">
					{#each data.myServiceListings as service}
						<a href="/dashboard/market/service/{service.id}" class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{service.title}</h3>
							</div>
							{#if service.category}
								<span class="listing-category t-label">{service.category}</span>
							{/if}
							<p class="listing-description">{service.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatRate(service.society_credits_rate, service.federation_credits_rate, service.rate_unit, true)}</span>
								<span class="listing-date">{formatShortDate(service.created_at)}</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>
		{/if}
	</div>
</div>

<style>
	.market-section {
		margin-bottom: var(--space-10);
	}

	.items-toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.search-input {
		flex: 1;
		min-width: 0;
	}

	.toggle-group {
		display: flex;
		border: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.toggle-btn {
		padding: var(--space-2) var(--space-4);
		background: none;
		border: none;
		border-right: 1px solid var(--border-subtle);
		color: var(--ink-mid);
		cursor: pointer;
		font: inherit;
		font-size: var(--text-sm);
		white-space: nowrap;
		transition: background 0.1s, color 0.1s;
	}

	.toggle-btn:last-child {
		border-right: none;
	}

	.toggle-btn:hover {
		background: var(--surface-dk);
		color: var(--ink);
	}

	.toggle-btn--active {
		background: var(--gold);
		color: var(--bg);
	}

	.toggle-btn--active:hover {
		background: var(--gold-hover);
	}

	.listing-form {
		padding: var(--space-5);
		margin-bottom: var(--space-6);
		background: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-group label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: var(--space-3);
	}

	.input,
	.select,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.textarea {
		resize: vertical;
	}

	.listings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.listing-card {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.listing-card:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.listing-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.listing-title {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
		flex: 1;
	}

	.listing-category {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.listing-type {
		font-size: var(--text-xs);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-faint);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.listing-type--offer {
		background: var(--tint-green);
		color: var(--ink-mid);
	}

	.listing-type--wanted {
		background: var(--tint-amber, var(--surface-dk));
		color: var(--ink-mid);
	}

	.listing-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
		line-height: 1.5;
	}

	.listing-footer {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-top: var(--space-3);
		border-top: 1px solid var(--border-faint);
	}

	.listing-price {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--gold);
	}

	.listing-dollar {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		cursor: pointer;
	}

	.listing-author {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		text-decoration: none;
	}

	.listing-author:hover {
		color: var(--gold);
	}

	.listing-date {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}
</style>
