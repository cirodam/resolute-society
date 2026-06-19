<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import { hasPermission } from '$lib/client/permissions';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';

	let { data }: { data: PageData } = $props();

	let showSubUnitForm = $state(false);
	let showPositionForm = $state(false);
	let showEditUnit = $state(false);

	function isExpired(date: Date | string | null) {
		if (!date) return false;
		return new Date(date) < new Date();
	}
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<div class="breadcrumb">
			{#if data.parentUnit}
				<a href="/society/units" class="breadcrumb-link">Units</a>
				<span class="breadcrumb-sep">/</span>
				<a href="/society/units/{data.parentUnit.id}" class="breadcrumb-link">{data.parentUnit.name}</a>
				<span class="breadcrumb-sep">/</span>
				<span>{data.unit.name}</span>
			{:else}
				<a href="/society/units" class="breadcrumb-link">Units</a>
				<span class="breadcrumb-sep">/</span>
				<span>{data.unit.name}</span>
			{/if}
		</div>
		<div class="section-header">
			<h1 class="t-display">{data.unit.name}</h1>
			{#if hasPermission(data.permissions, 'positions.create_officer')}
				<div class="header-actions">
					<button class="btn btn--secondary btn--small" onclick={() => (showEditUnit = !showEditUnit)}>
						{showEditUnit ? 'Cancel' : 'Edit'}
					</button>
					<form method="POST" action="?/deleteUnit" use:enhance>
						<ConfirmButton class="btn btn--secondary btn--small">Delete</ConfirmButton>
					</form>
				</div>
			{/if}
		</div>
		{#if data.unit.description && !showEditUnit}
			<p class="page-header-description">{data.unit.description}</p>
		{/if}

		{#if showEditUnit && hasPermission(data.permissions, 'positions.create_officer')}
			<form method="POST" action="?/updateUnit" use:enhance class="edit-form"
				onsubmit={() => (showEditUnit = false)}>
				<div class="form-group">
					<label for="edit-unit-name">Name</label>
					<input type="text" id="edit-unit-name" name="name" required class="input"
						value={data.unit.name} />
				</div>
				<div class="form-group">
					<label for="edit-unit-description">Description</label>
					<textarea id="edit-unit-description" name="description" class="textarea" rows="2"
					>{data.unit.description ?? ''}</textarea>
				</div>
				<div class="form-actions">
					<button type="submit" class="btn btn--primary">Save</button>
					<button type="button" class="btn btn--secondary" onclick={() => (showEditUnit = false)}>Cancel</button>
				</div>
			</form>
		{/if}
	</div>

	<div class="page-content">
		<!-- Sub-units -->
		<div class="section-card card-border">
			<div class="section-header">
				<h2 class="section-title">Sub-units ({data.subUnits.length})</h2>
				{#if hasPermission(data.permissions, 'positions.create_officer')}
					<button class="btn btn--primary btn--small" onclick={() => (showSubUnitForm = !showSubUnitForm)}>
						{showSubUnitForm ? 'Cancel' : '+ Add Sub-unit'}
					</button>
				{/if}
			</div>

			{#if showSubUnitForm}
				<form method="POST" action="?/createSubUnit" use:enhance class="inline-form">
					<div class="form-group">
						<label for="subunit-name">Unit Name</label>
						<input type="text" id="subunit-name" name="name" required class="input" placeholder="e.g., North Hub, Logistics Team" />
					</div>
					<div class="form-group">
						<label for="subunit-description">Description</label>
						<textarea id="subunit-description" name="description" class="textarea" rows="2" placeholder="Optional"></textarea>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn--primary">Create Sub-unit</button>
						<button type="button" class="btn btn--secondary" onclick={() => (showSubUnitForm = false)}>Cancel</button>
					</div>
				</form>
			{/if}

			{#if data.subUnits.length === 0 && !showSubUnitForm}
				<EmptyState message="No sub-units." />
			{:else}
				<div class="sub-units-grid">
					{#each data.subUnits as sub}
						<a href="/society/units/{sub.id}" class="sub-unit-card">
							<h3 class="sub-unit-name">{sub.name}</h3>
							<p class="sub-unit-counts">
								{sub.position_count} {sub.position_count === 1 ? 'position' : 'positions'}
							</p>
							{#if sub.leader_given_name}
								<p class="sub-unit-leader">{sub.leader_given_name} {sub.leader_surname}</p>
							{/if}
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Positions -->
		<div class="section-card card-border">
			<div class="section-header">
				<h2 class="section-title">Positions ({data.positions.length})</h2>
				{#if hasPermission(data.permissions, 'positions.create_officer')}
					<button class="btn btn--primary btn--small" onclick={() => (showPositionForm = !showPositionForm)}>
						{showPositionForm ? 'Cancel' : '+ Add Position'}
					</button>
				{/if}
			</div>

			{#if showPositionForm}
				<form method="POST" action="?/createPosition" use:enhance class="inline-form">
					<div class="form-group">
						<label for="pos-name">Position Name</label>
						<input type="text" id="pos-name" name="name" required class="input" placeholder="e.g., Treasurer, Coordinator" />
					</div>
					<div class="form-group">
						<label for="pos-description">Description</label>
						<textarea id="pos-description" name="description" class="textarea" rows="2" placeholder="Optional"></textarea>
					</div>
					<div class="form-group">
						<label class="checkbox-label">
							<input type="checkbox" name="is_unit_leader" value="true" />
							Unit Leader position
						</label>
						<p class="form-help">Only one position per unit can be the leader</p>
					</div>
					<div class="form-row-grid">
						<div class="form-group">
							<label for="pos-term">Term Limit (years)</label>
							<input type="number" id="pos-term" name="term_limit_years" value="2" min="1" required class="input" />
						</div>
						<div class="form-group">
							<label for="pos-allowance">Default Allowance</label>
							<input type="number" id="pos-allowance" name="default_allowance" value="0" min="0" step="0.01" required class="input" />
						</div>
					</div>
					<div class="form-actions">
						<button type="submit" class="btn btn--primary">Create Position</button>
						<button type="button" class="btn btn--secondary" onclick={() => (showPositionForm = false)}>Cancel</button>
					</div>
				</form>
			{/if}

			{#if data.positions.length === 0 && !showPositionForm}
				<EmptyState message="No positions in this unit." />
			{:else}
				<div class="positions-list">
					{#each data.positions as pos}
						<a href="/society/units/{data.unit.id}/{pos.id}" class="position-item">
							<div class="position-info">
								<div class="position-name-row">
									<h3 class="position-name">{pos.name}</h3>
									{#if pos.is_unit_leader}
										<span class="leader-badge">Unit Leader</span>
									{/if}
								</div>
								{#if pos.description}
									<p class="position-description">{pos.description}</p>
								{/if}
								<p class="position-meta">Term: {pos.term_limit_years}y · {pos.current_allowance.toFixed(0)} credits</p>
							</div>
							<div class="position-status">
								{#if pos.current_person_id}
									<div class="status-filled">
										<span class="status-name">{pos.given_name} {pos.surname}</span>
										{#if isExpired(pos.term_expires_at)}
											<span class="status-expired">Term expired {formatLongDate(pos.term_expires_at)}</span>
										{:else}
											<span class="status-expires">Expires {formatLongDate(pos.term_expires_at)}</span>
										{/if}
									</div>
								{:else}
									<span class="status-vacant">Vacant</span>
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.header-actions {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		margin-top: var(--space-3);
	}

	.edit-form .form-group label {
		display: block;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.edit-form .input,
	.edit-form .textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--surface);
		width: 100%;
	}

	.edit-form .textarea { resize: vertical; }

	.form-actions {
		display: flex;
		gap: var(--space-3);
	}

	.page-header-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		font-style: italic;
		margin: 0;
	}

	.section-card {
		padding: var(--space-5);
		background: var(--surface);
		margin-bottom: var(--space-6);
	}

	.section-card:last-child { margin-bottom: 0; }

	.inline-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		margin: var(--space-4) 0;
	}

	.form-group label {
		display: block;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.form-help {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		font-style: italic;
		margin: var(--space-1) 0 0;
	}

	.checkbox-label {
		display: flex !important;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
		cursor: pointer;
	}

	.form-row-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
	}

	.input,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.textarea { resize: vertical; }

	.sub-units-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-3);
		margin-top: var(--space-4);
	}

	.sub-unit-card {
		display: block;
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}

	.sub-unit-card:hover { border-color: var(--gold); }

	.sub-unit-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
	}

	.sub-unit-counts,
	.sub-unit-leader {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		margin: 0;
	}

	.positions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.position-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--border-faint);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.position-item:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.position-info { flex: 1; }

	.position-name-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-1);
	}

	.position-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
	}

	.leader-badge {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		background: var(--tint-gold);
		color: var(--gold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.position-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
		margin: 0 0 var(--space-1) 0;
	}

	.position-meta {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0;
	}

	.position-status { flex-shrink: 0; text-align: right; }

	.status-filled {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.status-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.status-expires {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.status-expired {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--red, #c41e3a);
		font-weight: 600;
	}

	.status-vacant {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
