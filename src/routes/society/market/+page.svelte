<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatShortDate } from '$lib/client/datetime';
	import { economyTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();

	let showOfferForm = $state(false);
	let showWantedForm = $state(false);
	let showServiceForm = $state(false);

	function formatPrice(societyPrice: number | null, federationPrice: number | null) {
		if (societyPrice === null && federationPrice === null) return 'Free / Trade';
		const parts = [];
		if (societyPrice !== null) parts.push(`${societyPrice.toFixed(0)} SC`);
		if (federationPrice !== null) parts.push(`${federationPrice.toFixed(0)} FC`);
		return parts.join(' + ');
	}

	function formatRate(societyRate: number | null, federationRate: number | null, rateUnit: string | null) {
		if (societyRate === null && federationRate === null) return 'Rate negotiable';
		const parts = [];
		if (societyRate !== null) parts.push(`${societyRate.toFixed(0)} SC`);
		if (federationRate !== null) parts.push(`${federationRate.toFixed(0)} FC`);
		const unitStr = rateUnit ? `/${rateUnit}` : '';
		return parts.join(' + ') + unitStr;
	}

	const offers = $derived(data.itemListings.filter((item) => item.type === 'offer'));
	const wanted = $derived(data.itemListings.filter((item) => item.type === 'wanted'));
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Market</h1>
		<p class="page-header-description">
			Marketplace for {data.society.name}
		</p>
	</div>

	<Subnav tabs={economyTabs} />

	<div class="page-content">
		<section class="market-section">
			<div class="section-header">
				<h2 class="section-title">Items for Sale</h2>
				<button class="btn btn--primary btn--small" onclick={() => showOfferForm = !showOfferForm}>
					{showOfferForm ? 'Cancel' : '+ List Item'}
				</button>
			</div>

			{#if showOfferForm}
				<form method="POST" action="?/createItem" use:enhance class="listing-form card-border">
					<input type="hidden" name="type" value="offer" />
					<div class="form-group">
						<label for="offer-title">Title</label>
						<input type="text" id="offer-title" name="title" required class="input" />
					</div>
					<div class="form-group">
						<label for="offer-category">Category</label>
						<input type="text" id="offer-category" name="category" placeholder="e.g., furniture, electronics" class="input" />
					</div>
					<div class="form-group">
						<label for="offer-description">Description</label>
						<textarea id="offer-description" name="description" required class="textarea" rows="3"></textarea>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="offer-society-price">Society Credits</label>
							<input type="number" id="offer-society-price" name="society_credits_price" step="0.01" class="input" placeholder="Optional" />
						</div>
						<div class="form-group">
							<label for="offer-federation-price">Federation Credits</label>
							<input type="number" id="offer-federation-price" name="federation_credits_price" step="0.01" class="input" placeholder="Optional (requires SC)" />
						</div>
					</div>
					<button type="submit" class="btn btn--primary">Post Listing</button>
				</form>
			{/if}

			{#if offers.length === 0 && !showOfferForm}
				<p class="empty-state">No items for sale yet.</p>
			{:else if !showOfferForm}
				<div class="listings-grid">
					{#each offers as item}
						<div class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{item.title}</h3>
								{#if item.category}
									<span class="listing-category t-label">{item.category}</span>
								{/if}
							</div>
							<p class="listing-description">{item.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatPrice(item.society_credits_price, item.federation_credits_price)}</span>
								<a href="/person/{item.person_id}" class="listing-author">
									{item.given_name} {item.surname}
								</a>
								<span class="listing-date">{formatShortDate(item.created_at)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="market-section">
			<div class="section-header">
				<h2 class="section-title">Items Wanted</h2>
				<button class="btn btn--primary btn--small" onclick={() => showWantedForm = !showWantedForm}>
					{showWantedForm ? 'Cancel' : '+ Request Item'}
				</button>
			</div>

			{#if showWantedForm}
				<form method="POST" action="?/createItem" use:enhance class="listing-form card-border">
					<input type="hidden" name="type" value="wanted" />
					<div class="form-group">
						<label for="wanted-title">Title</label>
						<input type="text" id="wanted-title" name="title" required class="input" />
					</div>
					<div class="form-group">
						<label for="wanted-category">Category</label>
						<input type="text" id="wanted-category" name="category" placeholder="e.g., furniture, electronics" class="input" />
					</div>
					<div class="form-group">
						<label for="wanted-description">Description</label>
						<textarea id="wanted-description" name="description" required class="textarea" rows="3"></textarea>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="wanted-society-price">Society Credits</label>
							<input type="number" id="wanted-society-price" name="society_credits_price" step="0.01" class="input" placeholder="Optional" />
						</div>
						<div class="form-group">
							<label for="wanted-federation-price">Federation Credits</label>
							<input type="number" id="wanted-federation-price" name="federation_credits_price" step="0.01" class="input" placeholder="Optional (requires SC)" />
						</div>
					</div>
					<button type="submit" class="btn btn--primary">Post Request</button>
				</form>
			{/if}

			{#if wanted.length === 0 && !showWantedForm}
				<p class="empty-state">No wanted items yet.</p>
			{:else if !showWantedForm}
				<div class="listings-grid">
					{#each wanted as item}
						<div class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{item.title}</h3>
								{#if item.category}
									<span class="listing-category t-label">{item.category}</span>
								{/if}
							</div>
							<p class="listing-description">{item.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatPrice(item.society_credits_price, item.federation_credits_price)}</span>
								<a href="/person/{item.person_id}" class="listing-author">
									{item.given_name} {item.surname}
								</a>
								<span class="listing-date">{formatShortDate(item.created_at)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<section class="market-section">
			<div class="section-header">
				<h2 class="section-title">Services</h2>
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
						<input type="text" id="service-category" name="category" placeholder="e.g., plumbing, carpentry, electrical" class="input" />
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
					<button type="submit" class="btn btn--primary">Post Service</button>
				</form>
			{/if}

			{#if data.serviceListings.length === 0 && !showServiceForm}
				<p class="empty-state">No services offered yet.</p>
			{:else if !showServiceForm}
				<div class="listings-grid">
					{#each data.serviceListings as service}
						<div class="listing-card card-border">
							<div class="listing-header">
								<h3 class="listing-title">{service.title}</h3>
								{#if service.category}
									<span class="listing-category t-label">{service.category}</span>
								{/if}
							</div>
							<p class="listing-description">{service.description}</p>
							<div class="listing-footer">
								<span class="listing-price">{formatRate(service.society_credits_rate, service.federation_credits_rate, service.rate_unit)}</span>
								<a href="/person/{service.person_id}" class="listing-author">
									{service.given_name} {service.surname}
								</a>
								<span class="listing-date">{formatShortDate(service.created_at)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</div>

<style>
	.market-section {
		margin-bottom: var(--space-10);
	}

	/* section-header here doesn't have gap (global has gap: space-3) */
	.section-header {
		gap: 0;
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
