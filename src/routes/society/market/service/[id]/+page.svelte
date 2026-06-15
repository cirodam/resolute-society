<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('Listing');
	const tabs = $derived(
		data.isOwner && data.listing.status === 'active'
			? [{ label: 'Listing' }, { label: 'Edit' }]
			: [{ label: 'Listing' }]
	);

	const SERVICE_CATEGORIES = [
		'Medical & Health', 'Construction & Repair', 'Farming & Gardening',
		'Education & Training', 'Food Preparation', 'Animal Care', 'Transportation',
		'Security', 'Crafts & Manufacturing', 'Technical & Mechanical',
		'Legal & Administrative', 'Childcare & Care'
	];

	function formatRate(societyRate: number | null, federationRate: number | null, rateUnit: string | null) {
		if (societyRate === null && federationRate === null) return 'Rate negotiable';
		const parts = [];
		if (societyRate !== null) parts.push(`${societyRate.toFixed(0)} society credits`);
		if (federationRate !== null) parts.push(`${federationRate.toFixed(0)} federation credits`);
		const unitStr = rateUnit ? `/${rateUnit}` : '';
		return parts.join(' + ') + unitStr;
	}
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/society/market" class="breadcrumb-link">Market</a>
			<span class="breadcrumb-sep">/</span>
			<span>Service</span>
		</div>
		<div class="title-row">
			<h1 class="t-display">{data.listing.title}</h1>
			{#if data.listing.status !== 'active'}
				<span class="status-badge">Inactive</span>
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
					<span class="meta-label">Rate</span>
					<span class="meta-value price">
						{formatRate(data.listing.society_credits_rate, data.listing.federation_credits_rate, data.listing.rate_unit)}
					</span>
				</div>
				<div class="meta-row">
					<span class="meta-label">Offered by</span>
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
					<form method="POST" action="?/deactivate" use:enhance>
						<ConfirmButton class="btn btn--secondary">Deactivate Listing</ConfirmButton>
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
						{#each SERVICE_CATEGORIES as cat}
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
						<label for="edit-society-rate">Society Credits</label>
						<input type="number" id="edit-society-rate" name="society_credits_rate"
							step="0.01" class="input" placeholder="Optional"
							value={data.listing.society_credits_rate ?? ''} />
					</div>
					<div class="form-group">
						<label for="edit-federation-rate">Federation Credits</label>
						<input type="number" id="edit-federation-rate" name="federation_credits_rate"
							step="0.01" class="input" placeholder="Optional"
							value={data.listing.federation_credits_rate ?? ''} />
					</div>
					<div class="form-group">
						<label for="edit-rate-unit">Per</label>
						<select id="edit-rate-unit" name="rate_unit" class="select">
							<option value="" selected={!data.listing.rate_unit}>Negotiable</option>
							<option value="hour" selected={data.listing.rate_unit === 'hour'}>Hour</option>
							<option value="day" selected={data.listing.rate_unit === 'day'}>Day</option>
							<option value="job" selected={data.listing.rate_unit === 'job'}>Job</option>
						</select>
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
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.breadcrumb-link { text-decoration: none; color: inherit; }
	.breadcrumb-link:hover { color: var(--gold); }
	.breadcrumb-sep { color: var(--ink-faint); }

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.status-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--surface-dk);
		color: var(--ink-faint);
	}

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

	.meta-link { text-decoration: none; color: inherit; }
	.meta-link:hover { color: var(--gold); }

	.owner-actions { display: flex; gap: var(--space-3); }

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
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
