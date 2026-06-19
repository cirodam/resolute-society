<script lang="ts">
	import { PERMISSION } from '$lib/permissions';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import { hasPermission } from '$lib/client/permissions';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();

	let activeTab = $state('Details');
	let showPermissionGrant = $state(false);

	const tabs = $derived(
		hasPermission(data.permissions, PERMISSION.POSITIONS_CREATE_OFFICER)
			? [{ label: 'Details' }, { label: 'Description' }, { label: 'Edit' }]
			: [{ label: 'Details' }, { label: 'Description' }]
	);

	function isExpired(date: Date | string | null) {
		if (!date) return false;
		return new Date(date) < new Date();
	}

	function groupByCategory<T extends { category: string }>(items: T[]) {
		const grouped = new Map<string, T[]>();
		for (const item of items) {
			if (!grouped.has(item.category)) grouped.set(item.category, []);
			grouped.get(item.category)!.push(item);
		}
		return grouped;
	}

	const currentIds = $derived(new Set(data.currentPermissions.map(p => p.id)));
	const availablePermissions = $derived(data.allPermissions.filter(p => !currentIds.has(p.id)));
	const groupedCurrent = $derived(groupByCategory(data.currentPermissions));
	const groupedAvailable = $derived(groupByCategory(availablePermissions));
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/dashboard/units" class="breadcrumb-link">Units</a>
			<span class="breadcrumb-sep">/</span>
			<a href="/dashboard/units/{data.unit.id}" class="breadcrumb-link">{data.unit.name}</a>
			<span class="breadcrumb-sep">/</span>
			<span>{data.position.name}</span>
		</div>
		<div class="title-row">
			<h1 class="t-display">{data.position.name}</h1>
			{#if data.position.is_unit_leader}
				<span class="leader-badge">Unit Leader</span>
			{/if}
		</div>
		<p class="term-meta">
			{data.unit.name} · Term limit: {data.position.term_limit_years} {data.position.term_limit_years === 1 ? 'year' : 'years'} · Default allowance: {data.position.default_allowance.toFixed(0)} credits
		</p>
	</div>

	<Subnav {tabs} {activeTab} onTabClick={(t) => (activeTab = t)} />

	{#if activeTab === 'Details'}
		<div class="page-content">
			<!-- Appointment -->
			<div class="section-card card-border">
				<h2 class="section-title">Current Appointment</h2>

				{#if data.position.current_person_id}
					<div class="holder-info">
						<a href="/person/{data.position.current_person_id}" class="holder-link">
							<p class="holder-name">{data.position.given_name} {data.position.surname}</p>
							<p class="holder-handle">{data.position.handle}</p>
						</a>
						<div class="appointment-dates" class:expired-bg={isExpired(data.position.term_expires_at)}>
							<p class="date-row">Appointed: {formatLongDate(data.position.appointed_at)}</p>
							<p class="date-row" class:expired-text={isExpired(data.position.term_expires_at)}>
								{isExpired(data.position.term_expires_at) ? 'Term expired:' : 'Expires:'}
								{formatLongDate(data.position.term_expires_at)}
							</p>
						</div>
						{#if hasPermission(data.permissions, PERMISSION.POSITIONS_REMOVE_PERSON)}
							<form method="POST" action="?/remove" use:enhance>
								<button type="submit" class="btn btn--secondary">Remove from Position</button>
							</form>
						{/if}
					</div>
				{:else}
					<div class="holder-vacant">
						<p class="vacant-text">This position is currently vacant.</p>
						{#if hasPermission(data.permissions, PERMISSION.POSITIONS_ASSIGN_PERSON)}
							<form method="POST" action="?/assign" use:enhance class="assign-form">
								<label for="person-select" class="form-label">Appoint Person</label>
								<div class="form-row">
									<select id="person-select" name="person_id" required class="select">
										<option value="">Select member...</option>
										{#each data.eligibleMembers as member}
											<option value={member.id}>
												{member.given_name} {member.surname} ({member.handle})
											</option>
										{/each}
									</select>
									<button type="submit" class="btn btn--primary">Appoint</button>
								</div>
							</form>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Permissions -->
			{#if hasPermission(data.permissions, PERMISSION.POSITIONS_CREATE_OFFICER)}
				<div class="section-card card-border">
					<div class="section-header">
						<h2 class="section-title">Permissions ({data.currentPermissions.length})</h2>
						<button class="btn btn--primary btn--small" onclick={() => (showPermissionGrant = !showPermissionGrant)}>
							{showPermissionGrant ? 'Cancel' : '+ Grant Permission'}
						</button>
					</div>

					{#if showPermissionGrant}
						<div class="grant-section">
							<h3 class="subsection-title">Grant New Permission</h3>
							{#if availablePermissions.length === 0}
								<EmptyState message="All permissions have already been granted." />
							{:else}
								{#each [...groupedAvailable.entries()] as [category, perms]}
									<div class="perm-category">
										<h4 class="category-title">{category}</h4>
										<div class="perms-list">
											{#each perms as perm}
												<form method="POST" action="?/grantPermission" use:enhance class="perm-item">
													<input type="hidden" name="permission_id" value={perm.id} />
													<div class="perm-info">
														<span class="perm-name">{perm.name}</span>
														<span class="perm-code">{perm.code}</span>
													</div>
													<button type="submit" class="btn btn--primary btn--small">Grant</button>
												</form>
											{/each}
										</div>
									</div>
								{/each}
							{/if}
						</div>
					{/if}

					{#if data.currentPermissions.length === 0}
						<EmptyState message="No permissions granted yet." />
					{:else}
						{#each [...groupedCurrent.entries()] as [category, perms]}
							<div class="perm-category">
								<h4 class="category-title">{category}</h4>
								<div class="perms-list">
									{#each perms as perm}
										<div class="perm-item">
											<div class="perm-info">
												<span class="perm-name">{perm.name}</span>
												<span class="perm-code">{perm.code}</span>
											</div>
											<form method="POST" action="?/revokePermission" use:enhance>
												<input type="hidden" name="permission_id" value={perm.id} />
												<button type="submit" class="btn btn--secondary btn--small">Revoke</button>
											</form>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>

	{:else if activeTab === 'Edit'}
		<div class="edit-view">
			<form method="POST" action="?/updatePosition" use:enhance class="edit-form"
				onsubmit={() => (activeTab = 'Details')}>
				<div class="form-group">
					<label for="edit-name">Position Name</label>
					<input type="text" id="edit-name" name="name" required class="input"
						value={data.position.name} />
				</div>
				<div class="form-group">
					<label for="edit-description">Description</label>
					<textarea id="edit-description" name="description" class="textarea" rows="6"
						placeholder="Describe the responsibilities, expectations, and scope of this position"
					>{data.position.description ?? ''}</textarea>
				</div>
				<div class="form-group">
					<label class="checkbox-label">
						<input type="checkbox" name="is_unit_leader" value="true"
							checked={data.position.is_unit_leader} />
						Unit Leader position
					</label>
					<p class="form-help">Only one position per unit can be the leader</p>
				</div>
				<div class="form-row-grid">
					<div class="form-group">
						<label for="edit-term">Term Limit (years)</label>
						<input type="number" id="edit-term" name="term_limit_years" min="1" required
							class="input" value={data.position.term_limit_years} />
					</div>
					<div class="form-group">
						<label for="edit-allowance">Default Allowance (credits)</label>
						<input type="number" id="edit-allowance" name="default_allowance" min="0"
							step="0.01" required class="input" value={data.position.default_allowance} />
					</div>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn--primary">Save Changes</button>
					<button type="button" class="btn btn--secondary" onclick={() => (activeTab = 'Details')}>Cancel</button>
				</div>
			</form>

			{#if hasPermission(data.permissions, PERMISSION.POSITIONS_CREATE_OFFICER)}
				<div class="danger-zone">
					<h3 class="danger-title">Danger Zone</h3>
					<form method="POST" action="?/deletePosition" use:enhance>
						<ConfirmButton class="btn btn--secondary">Delete Position</ConfirmButton>
					</form>
					<p class="danger-note">
						Cannot delete a position with an active appointment. Remove the person first.
					</p>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'Description'}
		<div class="description-view">
			{#if data.position.description}
				<div class="job-listing">
					<div class="listing-header">
						<h2 class="listing-title">{data.position.name}</h2>
						<p class="listing-unit">{data.unit.name}</p>
					</div>
					<div class="listing-meta">
						<div class="meta-item">
							<span class="meta-label">Term</span>
							<span class="meta-value">{data.position.term_limit_years} {data.position.term_limit_years === 1 ? 'year' : 'years'}</span>
						</div>
						<div class="meta-item">
							<span class="meta-label">Allowance</span>
							<span class="meta-value">{data.position.default_allowance.toFixed(0)} credits / period</span>
						</div>
						{#if data.position.is_unit_leader}
							<div class="meta-item">
								<span class="meta-label">Role</span>
								<span class="meta-value leader-text">Unit Leader</span>
							</div>
						{/if}
					</div>
					<div class="listing-body">
						<h3 class="listing-section-title">About this Position</h3>
						<p class="listing-description">{data.position.description}</p>
					</div>
				</div>
			{:else}
				<EmptyState message="No description has been written for this position." />
			{/if}
		</div>
	{/if}
</div>

<style>
	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.leader-badge {
		display: inline-block;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		background: var(--tint-gold);
		color: var(--gold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.term-meta {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	/* Details tab */
	.section-card {
		padding: var(--space-6);
		background: var(--surface);
		margin-bottom: var(--space-6);
	}

	.section-card:last-child { margin-bottom: 0; }

	.holder-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.holder-link { text-decoration: none; color: inherit; }
	.holder-link:hover .holder-name { color: var(--gold); }

	.holder-name {
		font-family: var(--font-prose);
		font-size: var(--text-xl);
		font-weight: 600;
		margin: 0 0 var(--space-1);
		transition: color 0.15s;
	}

	.holder-handle {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.appointment-dates {
		padding: var(--space-4);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.appointment-dates.expired-bg { background: rgba(196, 30, 58, 0.05); }

	.date-row {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-2);
	}

	.date-row:last-child { margin-bottom: 0; }
	.date-row.expired-text { color: var(--red, #c41e3a); font-weight: 600; }

	.holder-vacant {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.vacant-text {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	.assign-form { display: flex; flex-direction: column; gap: var(--space-3); }

	.form-label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.form-row { display: flex; gap: var(--space-3); }

	.select {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.grant-section {
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		margin-bottom: var(--space-4);
	}

	.subsection-title {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0 0 var(--space-3);
	}

	.perm-category { margin-bottom: var(--space-4); }
	.perm-category:last-child { margin-bottom: 0; }

	.category-title {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: capitalize;
		color: var(--ink-mid);
		margin: 0 0 var(--space-2);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-faint);
	}

	.perms-list { display: flex; flex-direction: column; gap: var(--space-2); }

	.perm-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: var(--surface);
		border: 1px solid var(--border-faint);
	}

	.perm-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }

	.perm-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.perm-code {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	/* Edit tab */
	.edit-view {
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

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

	.checkbox-label {
		display: flex !important;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}

	.form-help {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		font-style: italic;
		margin: var(--space-1) 0 0;
	}

	.form-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.edit-form .input,
	.edit-form .textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.edit-form .textarea { resize: vertical; }

	.form-actions {
		display: flex;
		gap: var(--space-3);
	}

	.danger-zone {
		padding: var(--space-5);
		border: 1px solid rgba(196, 30, 58, 0.3);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.danger-title {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--red, #c41e3a);
		margin: 0;
	}

	.danger-note {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	/* Description tab */
	.description-view {
		max-width: 680px;
	}

	.job-listing {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.listing-header {
		border-bottom: 2px solid var(--border);
		padding-bottom: var(--space-5);
	}

	.listing-title {
		font-family: var(--font-prose);
		font-size: var(--text-2xl);
		font-weight: 700;
		margin: 0 0 var(--space-2);
	}

	.listing-unit {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--gold);
		margin: 0;
		font-weight: 600;
	}

	.listing-meta {
		display: flex;
		gap: var(--space-6);
		flex-wrap: wrap;
	}

	.meta-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.meta-label {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.meta-value {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
	}

	.leader-text { color: var(--gold); }

	.listing-section-title {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--ink-mid);
		margin: 0 0 var(--space-4);
	}

	.listing-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.75;
		color: var(--ink);
		margin: 0;
		white-space: pre-wrap;
	}
</style>
