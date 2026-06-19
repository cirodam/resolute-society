<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { governanceTabs } from '$lib/client/navigation';
	import { hasPermission } from '$lib/client/permissions';
	import Subnav from '$lib/components/Subnav.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data }: { data: PageData } = $props();

	let showUnitForm = $state(false);
</script>

<div class="page-container">
	<div class="page-header">
		<div class="section-header">
			<div>
				<h1 class="t-display">Units</h1>
				<p class="page-header-description">Organizational units and their positions</p>
			</div>
			<div class="header-actions">
				<a href="/dashboard/units/print" class="btn btn--secondary btn--small">Print Roster</a>
				{#if hasPermission(data.permissions, 'positions.create_officer')}
					<button class="btn btn--primary btn--small" onclick={() => (showUnitForm = !showUnitForm)}>
						{showUnitForm ? 'Cancel' : '+ New Unit'}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<Subnav tabs={governanceTabs} />

	{#if showUnitForm && hasPermission(data.permissions, 'positions.create_officer')}
		<form method="POST" action="?/createUnit" use:enhance class="unit-form card-border">
			<div class="form-group">
				<label for="unit-name">Unit Name</label>
				<input type="text" id="unit-name" name="name" required class="input" placeholder="e.g., Executive Officers, Logistics, Communications" />
			</div>
			<div class="form-group">
				<label for="unit-description">Description</label>
				<textarea id="unit-description" name="description" class="textarea" rows="2" placeholder="Optional"></textarea>
			</div>
			<button type="submit" class="btn btn--primary">Create Unit</button>
		</form>
	{/if}

	<div class="page-content">
		{#if data.rootUnits.length === 0}
			<EmptyState message="No units created yet. Create a unit to start organizing positions." />
		{:else}
			<div class="units-list">
				{#each data.rootUnits as unit}
					<a href="/dashboard/units/{unit.id}" class="unit-item card-border">
						<div class="unit-main">
							<h3 class="unit-name">{unit.name}</h3>
							{#if unit.description}
								<p class="unit-description">{unit.description}</p>
							{/if}
							<div class="unit-counts">
								<span>{unit.position_count} {unit.position_count === 1 ? 'position' : 'positions'}</span>
								{#if unit.sub_unit_count > 0}
									<span>· {unit.sub_unit_count} sub-{unit.sub_unit_count === 1 ? 'unit' : 'units'}</span>
								{/if}
							</div>
						</div>
						<div class="unit-leader">
							{#if unit.leader_person_id}
								<div class="leader-filled">
									<span class="leader-label">Led by</span>
									<span class="leader-name">{unit.leader_given_name} {unit.leader_surname}</span>
								</div>
							{:else if unit.leader_position_id}
								<div class="leader-vacant">
									<span class="leader-label">Leader position vacant</span>
								</div>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.unit-form {
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

	.input,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.textarea {
		resize: vertical;
	}

	.units-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.unit-item {
		padding: var(--space-4) var(--space-5);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.unit-item:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.unit-main {
		flex: 1;
	}

	.unit-name {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
	}

	.unit-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
		margin: 0 0 var(--space-2) 0;
	}

	.unit-counts {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.unit-leader {
		flex-shrink: 0;
		text-align: right;
	}

	.leader-filled,
	.leader-vacant {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		align-items: flex-end;
	}

	.leader-label {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.leader-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.leader-vacant .leader-label {
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
