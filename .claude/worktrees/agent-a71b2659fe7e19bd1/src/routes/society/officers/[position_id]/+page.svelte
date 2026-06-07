<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import { hasPermission } from '$lib/client/permissions';

	let { data }: { data: PageData } = $props();

	let showSubordinateForm = $state(false);
	let showPermissionGrant = $state(false);

	function isExpired(expiresAt: string | null) {
		if (!expiresAt) return false;
		return new Date(expiresAt) < new Date();
	}

	function getSubordinateLabel() {
		if (data.position.type === 'officer') return 'Section Chief';
		if (data.position.type === 'section_chief') return 'Line Worker';
		return 'Position';
	}

	function getSubordinateLabelPlural() {
		if (data.position.type === 'officer') return 'Section Chiefs';
		if (data.position.type === 'section_chief') return 'Line Workers';
		return 'Positions';
	}

	// Group permissions by category
	function groupByCategory(permissions: typeof data.currentPermissions) {
		const grouped = new Map<string, typeof permissions>();
		for (const perm of permissions) {
			if (!grouped.has(perm.category)) {
				grouped.set(perm.category, []);
			}
			grouped.get(perm.category)!.push(perm);
		}
		return grouped;
	}

	// Get permissions that can be granted (not already assigned)
	function getAvailablePermissions() {
		const currentIds = new Set(data.currentPermissions.map(p => p.id));
		return data.allPermissions.filter(p => !currentIds.has(p.id));
	}

	const groupedCurrent = $derived(groupByCategory(data.currentPermissions));
	const groupedAvailable = $derived(groupByCategory(getAvailablePermissions()));
</script>

<div class="page-container">
	<div class="page-header">
		<div class="breadcrumb">
			<a href="/society/officers" class="breadcrumb-link">Officer Corps</a>
			<span class="breadcrumb-separator">/</span>
			<span>{data.position.name}</span>
		</div>
		<h1 class="t-display">{data.position.name}</h1>
		{#if data.position.description}
			<p class="page-header-description">{data.position.description}</p>
		{/if}
		<p class="term-limit-info">Term limit: {data.position.term_limit_years} {data.position.term_limit_years === 1 ? 'year' : 'years'}</p>
	</div>

	<div class="page-content">
		<div class="position-card card-border">
			<h2 class="section-title">Current Appointment</h2>

			{#if data.position.current_person_id}
				<div class="officer-info">
					<a href="/person/{data.position.current_person_id}" class="officer-link">
						<p class="officer-name">{data.position.given_name} {data.position.surname}</p>
						<p class="officer-handle">{data.position.handle}</p>
					</a>
					<div class="appointment-details">
						<p class="appointment-date">
							Appointed: {formatLongDate(data.position.appointed_at)}
						</p>
						<p class="expiration-date" class:expired={isExpired(data.position.term_expires_at)}>
							{#if isExpired(data.position.term_expires_at)}
								Term expired: {formatLongDate(data.position.term_expires_at)}
							{:else}
								Expires: {formatLongDate(data.position.term_expires_at)}
							{/if}
						</p>
					</div>
					{#if hasPermission(data.permissions, 'positions.remove_person')}
						<form method="POST" action="?/remove" use:enhance>
							<button type="submit" class="btn btn--secondary">
								Remove from Office
							</button>
						</form>
					{/if}
				</div>
			{:else}
				<div class="officer-vacant">
					<p class="vacant-text">This position is currently vacant.</p>
					{#if hasPermission(data.permissions, 'positions.assign_person')}
						<form method="POST" action="?/assign" use:enhance class="assign-form">
							<label for="person-select" class="form-label">Appoint Officer</label>
							<div class="form-row">
								<select id="person-select" name="person_id" required class="select">
									<option value="">Select member...</option>
									{#each data.eligibleMembers as member}
										<option value={member.id}>
											{member.given_name} {member.surname} ({member.handle})
										</option>
									{/each}
								</select>
								<button type="submit" class="btn btn--primary">
									Appoint
								</button>
							</div>
						</form>
					{/if}
				</div>
			{/if}
		</div>

		{#if hasPermission(data.permissions, 'positions.create_officer')}
			<div class="position-card card-border">
				<div class="section-header">
					<h2 class="section-title">Permissions ({data.currentPermissions.length})</h2>
					<button class="btn btn--primary btn--small" onclick={() => showPermissionGrant = !showPermissionGrant}>
						{showPermissionGrant ? 'Cancel' : '+ Grant Permission'}
					</button>
				</div>

				{#if showPermissionGrant}
					<div class="permission-grant-section">
						<h3 class="subsection-title">Grant New Permission</h3>
						{#if getAvailablePermissions().length === 0}
							<p class="empty-state">All permissions have been granted to this position.</p>
						{:else}
							{#each [...groupedAvailable.entries()] as [category, perms]}
								<div class="permission-category">
									<h4 class="category-title">{category}</h4>
									<div class="permissions-list">
										{#each perms as perm}
											<form method="POST" action="?/grantPermission" use:enhance class="permission-item">
												<input type="hidden" name="permission_id" value={perm.id} />
												<div class="permission-info">
													<span class="permission-name">{perm.name}</span>
													<span class="permission-code">{perm.code}</span>
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
					<p class="empty-state">This position has no permissions granted yet.</p>
				{:else}
					{#each [...groupedCurrent.entries()] as [category, perms]}
						<div class="permission-category">
							<h4 class="category-title">{category}</h4>
							<div class="permissions-list">
								{#each perms as perm}
									<div class="permission-item">
										<div class="permission-info">
											<span class="permission-name">{perm.name}</span>
											<span class="permission-code">{perm.code}</span>
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

		{#if data.position.type !== 'line_worker'}
			<div class="position-card card-border">
				<div class="section-header">
					<h2 class="section-title">{getSubordinateLabelPlural()} ({data.subordinates.length})</h2>
					{#if hasPermission(data.permissions, 'positions.create_subordinate')}
						<button class="btn btn--primary btn--small" onclick={() => showSubordinateForm = !showSubordinateForm}>
							+ Create {getSubordinateLabel()}
						</button>
					{/if}
				</div>

				{#if showSubordinateForm && hasPermission(data.permissions, 'positions.create_subordinate')}
					<form method="POST" action="?/createSubordinate" use:enhance class="subordinate-form">
						<div class="form-group">
							<label for="name" class="form-label">Position Name</label>
							<input id="name" name="name" type="text" required class="input" placeholder="e.g., North Philly Hub Coordinator" />
						</div>

						<div class="form-group">
							<label for="description" class="form-label">Description</label>
							<textarea id="description" name="description" class="textarea" rows="3" placeholder="Optional description of responsibilities"></textarea>
						</div>

						<div class="form-row-grid">
							<div class="form-group">
								<label for="section" class="form-label">Section</label>
								<input id="section" name="section" type="text" class="input" placeholder="e.g., Logistics, Communications" />
							</div>

							<div class="form-group">
								<label for="term_limit_years" class="form-label">Term Limit (years)</label>
								<input id="term_limit_years" name="term_limit_years" type="number" min="1" value="2" class="input" />
							</div>
						</div>

						<div class="form-group">
							<label for="default_allowance" class="form-label">Default Allowance (society credits)</label>
							<input id="default_allowance" name="default_allowance" type="number" min="0" step="0.01" value="0" class="input" />
							<p class="form-help">Standard compensation for this position per pay period</p>
						</div>

						<div class="form-actions">
							<button type="submit" class="btn btn--primary">Create Position</button>
							<button type="button" class="btn btn--secondary" onclick={() => showSubordinateForm = false}>Cancel</button>
						</div>
					</form>
				{/if}

				{#if data.subordinates.length > 0}
					<div class="subordinates-grid">
						{#each data.subordinates as subordinate}
							<a href="/society/officers/{subordinate.id}" class="subordinate-card">
								<div class="subordinate-header">
									<h3 class="subordinate-name">{subordinate.name}</h3>
									{#if subordinate.section}
										<span class="subordinate-section">{subordinate.section}</span>
									{/if}
								</div>
								{#if subordinate.current_person_id}
									<p class="subordinate-holder">
										{subordinate.given_name} {subordinate.surname}
									</p>
									<p class="subordinate-meta">
										{#if isExpired(subordinate.term_expires_at)}
											<span class="expired">Term expired</span>
										{:else}
											Expires {formatLongDate(subordinate.term_expires_at)}
										{/if}
									</p>
								{:else}
									<p class="subordinate-vacant">Vacant</p>
								{/if}
							</a>
						{/each}
					</div>
				{:else if !showSubordinateForm}
					<p class="no-subordinates">No {getSubordinateLabelPlural().toLowerCase()} created yet.</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.page-container {
		max-width: 900px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.breadcrumb-link {
		text-decoration: none;
		color: inherit;
	}

	.breadcrumb-link:hover {
		color: var(--gold);
	}

	.breadcrumb-separator {
		color: var(--ink-faint);
	}

	/* page-header h1 has different margin here */
	.page-header h1 {
		margin: 0 0 var(--space-3) 0;
	}

	/* page-header-description has extra font-style: italic and color here */
	.page-header-description {
		margin: 0 0 var(--space-2) 0;
		font-style: italic;
		color: var(--ink-mid);
	}

	.term-limit-info {
		margin: 0;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.position-card {
		padding: var(--space-6);
		background: var(--surface);
		margin-bottom: var(--space-6);
	}

	.position-card:last-child {
		margin-bottom: 0;
	}

	/* section-title here has extra padding-bottom and border-bottom */
	.section-title {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-4) 0;
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-faint);
	}

	.officer-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.officer-link {
		text-decoration: none;
		color: inherit;
	}

	.officer-link:hover .officer-name {
		color: var(--gold);
	}

	.officer-name {
		font-family: var(--font-prose);
		font-size: var(--text-xl);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
		transition: color 0.15s;
	}

	.officer-handle {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.appointment-details {
		padding: var(--space-4);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.appointment-date,
	.expiration-date {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		margin: 0;
		color: var(--ink-mid);
	}

	.appointment-date {
		margin-bottom: var(--space-2);
	}

	.expiration-date.expired {
		color: var(--red, #c41e3a);
		font-weight: 600;
	}

	.officer-vacant {
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

	.assign-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.form-label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.form-help {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		margin: 0;
		font-style: italic;
	}

	.form-row {
		display: flex;
		gap: var(--space-3);
	}

	.select {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	/* section-header matches global, remove */

	.subordinate-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-md, 8px);
		margin-bottom: var(--space-4);
	}

	.form-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.input,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm, 4px);
		background: var(--surface);
	}

	.textarea {
		resize: vertical;
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
	}

	.subordinates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
		margin-top: var(--space-4);
	}

	.subordinate-card {
		display: block;
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-md, 8px);
		text-decoration: none;
		color: inherit;
		transition: all 0.15s ease;
	}

	.subordinate-card:hover {
		border-color: var(--gold);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.subordinate-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.subordinate-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
		flex: 1;
	}

	.subordinate-section {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-gold);
		color: var(--gold);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.subordinate-holder {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-1) 0;
	}

	.subordinate-meta {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		margin: 0;
	}

	.subordinate-meta .expired {
		color: var(--red, #c41e3a);
		font-weight: 600;
	}

	.subordinate-vacant {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	.no-subordinates {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
		text-align: center;
		padding: var(--space-6);
		margin: 0;
	}

	.permission-grant-section {
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-md, 8px);
		margin-bottom: var(--space-4);
	}

	.subsection-title {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0 0 var(--space-3) 0;
	}

	.permission-category {
		margin-bottom: var(--space-4);
	}

	.permission-category:last-child {
		margin-bottom: 0;
	}

	.category-title {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: capitalize;
		color: var(--ink-mid);
		margin: 0 0 var(--space-2) 0;
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-faint);
	}

	.permissions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.permission-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		background: var(--surface);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-sm, 4px);
	}

	.permission-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		flex: 1;
	}

	.permission-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.permission-code {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	/* empty-state here has extra font-size: text-sm */
	.empty-state {
		font-size: var(--text-sm);
	}
</style>
