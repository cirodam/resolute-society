<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import type { LocationRow, LocationCategoryRow } from '$lib/server/infra/repositories';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showLocationForm = $state(data.prefilledLat !== null);
	let editingLocation = $state<LocationRow | null>(null);
	let editingCategory = $state<LocationCategoryRow | null>(null);
	let showCategoryForm = $state(false);

	$effect(() => {
		if (form?.created || form?.updated || form?.deleted) {
			showLocationForm = false;
			editingLocation = null;
		}
		if ((form as any)?.categoryCreated || (form as any)?.categoryUpdated || (form as any)?.categoryDeleted) {
			showCategoryForm = false;
			editingCategory = null;
		}
	});
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Locations</h1>
		<p class="page-header-description">Named places associated with this society.</p>
	</div>

	<!-- ── CATEGORIES ── -->
	<div class="section-card card-border">
		<div class="card-header">
			<h2>Categories</h2>
			{#if !showCategoryForm && !editingCategory}
				<button class="btn" onclick={() => (showCategoryForm = true)}>Add Category</button>
			{/if}
		</div>

		{#if showCategoryForm || editingCategory}
			<form
				method="POST"
				action={editingCategory ? '?/updateCategory' : '?/createCategory'}
				use:enhance
				class="category-form"
			>
				{#if editingCategory}<input type="hidden" name="id" value={editingCategory.id} />{/if}
				<input
					name="name"
					type="text"
					value={editingCategory?.name ?? ''}
					placeholder="Category name"
					required
				/>
				<div class="color-field">
					<input name="color" type="color" value={editingCategory?.color ?? '#7a5c1a'} />
				</div>
				<button type="submit" class="btn btn--primary">{editingCategory ? 'Save' : 'Add'}</button>
				<button type="button" class="btn" onclick={() => { showCategoryForm = false; editingCategory = null; }}>Cancel</button>
			</form>
		{/if}

		{#if data.categories.length === 0 && !showCategoryForm}
			<p class="empty-inline">No categories yet.</p>
		{:else if data.categories.length > 0}
			<div class="category-list">
				{#each data.categories as cat}
					<div class="category-row">
						<span class="color-swatch" style="background: {cat.color}"></span>
						<span class="category-name t-label">{cat.name}</span>
						<div class="category-actions">
							<button class="btn btn--xs" onclick={() => (editingCategory = cat)}>Edit</button>
							<form method="POST" action="?/deleteCategory" use:enhance style="display:inline">
								<input type="hidden" name="id" value={cat.id} />
								<button type="submit" class="btn btn--xs btn--danger">Delete</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- ── LOCATIONS ── -->
	<div class="toolbar">
		{#if !showLocationForm && !editingLocation}
			<button class="btn btn--primary" onclick={() => (showLocationForm = true)}>Add Location</button>
		{/if}
	</div>

	{#if form?.createError || form?.updateError}
		<div class="error-message">{form.createError ?? form.updateError}</div>
	{/if}

	{#if showLocationForm || editingLocation}
		<div class="form-card card-border">
			<div class="card-header">
				<h2>{editingLocation ? 'Edit Location' : 'New Location'}</h2>
			</div>
			<form
				method="POST"
				action={editingLocation ? '?/update' : '?/create'}
				use:enhance
				class="location-form"
			>
				{#if editingLocation}<input type="hidden" name="id" value={editingLocation.id} />{/if}

				<div class="form-row">
					<div class="form-group">
						<label for="loc-name">Name</label>
						<input id="loc-name" name="name" type="text" value={editingLocation?.name ?? ''} required placeholder="West Philly Tool Library" />
					</div>
					<div class="form-group">
						<label for="loc-category">Category</label>
						<select id="loc-category" name="category_id">
							<option value="">— none —</option>
							{#each data.categories as cat}
								<option
									value={cat.id}
									selected={editingLocation?.category?.id === cat.id}
								>{cat.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label for="loc-address">Address</label>
					<input id="loc-address" name="address" type="text" value={editingLocation?.address ?? ''} placeholder="4928 Baltimore Ave, Philadelphia, PA" />
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="loc-lat">Latitude</label>
						<input id="loc-lat" name="lat" type="number" step="0.000001" value={editingLocation?.lat ?? data.prefilledLat ?? ''} placeholder="39.94524" required />
					</div>
					<div class="form-group">
						<label for="loc-lng">Longitude</label>
						<input id="loc-lng" name="lng" type="number" step="0.000001" value={editingLocation?.lng ?? data.prefilledLng ?? ''} placeholder="-75.22018" required />
					</div>
				</div>

				<div class="form-group">
					<label for="loc-notes">Notes</label>
					<textarea id="loc-notes" name="notes" rows="3" placeholder="Open Saturdays 10am–2pm">{editingLocation?.notes ?? ''}</textarea>
				</div>

				<div class="form-actions">
					<button type="button" class="btn" onclick={() => { showLocationForm = false; editingLocation = null; }}>Cancel</button>
					<button type="submit" class="btn btn--primary">{editingLocation ? 'Save Changes' : 'Add Location'}</button>
				</div>
			</form>
		</div>
	{/if}

	{#if data.locations.length === 0}
		<div class="empty-state card-border">
			<p>No locations yet. Add places relevant to your society — meeting halls, tool libraries, gardens, hubs.</p>
		</div>
	{:else}
		<div class="locations-list">
			{#each data.locations as loc}
				<div class="location-card card-border">
					<div class="card-header">
						<div class="location-title">
							{#if loc.category}
								<span class="color-swatch" style="background: {loc.category.color}"></span>
							{/if}
							<h2>{loc.name}</h2>
							{#if loc.category}
								<span class="category-tag t-label">{loc.category.name}</span>
							{/if}
						</div>
						<div class="location-actions">
							<button class="btn btn--xs" onclick={() => (editingLocation = loc)}>Edit</button>
							<form method="POST" action="?/delete" use:enhance style="display:inline">
								<input type="hidden" name="id" value={loc.id} />
								<button type="submit" class="btn btn--xs btn--danger">Delete</button>
							</form>
						</div>
					</div>
					<div class="location-body">
						{#if loc.address}
							<p class="location-address">{loc.address}</p>
						{/if}
						<p class="location-coords t-label">{loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}</p>
						{#if loc.notes}
							<p class="location-notes">{loc.notes}</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-container {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* page-header has margin-bottom: 0 here, page-header h1 has different margin */
	.page-header { margin-bottom: 0; }
	.page-header h1 { margin: 0 0 0.25rem 0; }

	/* error-message has different padding here (0.75rem 1rem vs global space-3) */
	.error-message {
		padding: 0.75rem 1rem;
		margin-bottom: 0;
	}

	.toolbar { display: flex; justify-content: flex-end; }

	/* Category section */
	.section-card { overflow: hidden; }

	.category-form {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.category-form input[type="text"] { flex: 1; }

	.color-field { display: flex; align-items: center; }

	.color-field input[type="color"] {
		width: 2.5rem;
		height: 2.25rem;
		padding: 0.1rem;
		cursor: pointer;
	}

	.category-list {
		display: flex;
		flex-direction: column;
	}

	.category-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.color-swatch {
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 50%;
		flex-shrink: 0;
		border: 1px solid rgba(0,0,0,0.12);
	}

	.category-name { flex: 1; font-size: var(--text-sm); letter-spacing: 0.1em; }

	.category-actions { display: flex; gap: 0.4rem; }

	.empty-inline {
		padding: 0.75rem 1.5rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
		border-top: 1px solid var(--border-subtle);
	}

	/* Location form */
	.location-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
	}

	/* Location list */
	.locations-list { display: flex; flex-direction: column; gap: 1rem; }

	.location-title {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.location-title h2 { margin: 0; }

	.category-tag {
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
		color: var(--ink-faint);
	}

	.location-actions { display: flex; gap: 0.4rem; }

	.location-body {
		padding: 0.75rem 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.location-address {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.location-coords {
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--ink-faint);
		margin: 0;
	}

	.location-notes {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
		margin: 0.25rem 0 0;
		white-space: pre-wrap;
	}

	/* empty-state has different padding and font-size here */
	.empty-state {
		padding: 2rem 1.5rem;
		font-size: var(--text-sm);
	}
</style>
