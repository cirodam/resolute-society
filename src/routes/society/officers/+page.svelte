<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { governanceTabs } from '$lib/client/navigation';
	import { hasPermission } from '$lib/client/permissions';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data }: { data: PageData } = $props();

	let showPositionForm = $state(false);
</script>

<div class="page-container">
	<div class="page-header">
		<div class="header-content">
			<div>
				<h1 class="t-display">Officer Corps</h1>
				<p class="page-header-description">
					The executive officers of {data.society.name}
				</p>
			</div>
			<a href="/society/officers/print" class="btn btn--secondary btn--small">Print Roster</a>
			{#if hasPermission(data.permissions, 'positions.create_officer')}
				<button class="btn btn--primary btn--small" onclick={() => showPositionForm = !showPositionForm}>
					{showPositionForm ? 'Cancel' : '+ Create Position'}
				</button>
			{/if}
		</div>
	</div>

	<Subnav tabs={governanceTabs} />

	{#if showPositionForm && hasPermission(data.permissions, 'positions.create_officer')}
		<form method="POST" action="?/createPosition" use:enhance class="position-form card-border">
			<div class="form-group">
				<label for="position-name">Position Name</label>
				<input type="text" id="position-name" name="name" required class="input" placeholder="e.g., Secretary, Steward" />
			</div>
			<div class="form-group">
				<label for="position-description">Description</label>
				<textarea id="position-description" name="description" class="textarea" rows="3" placeholder="Optional"></textarea>
			</div>
			<div class="form-group">
				<label for="position-term-limit">Term Limit (years)</label>
				<input type="number" id="position-term-limit" name="term_limit_years" value="2" required class="input" min="1" />
			</div>
			<div class="form-group">
				<label for="position-allowance">Default Allowance (society credits)</label>
				<input type="number" id="position-allowance" name="default_allowance" value="0" required class="input" min="0" step="0.01" />
				<p class="form-help">Standard compensation for this position per pay period</p>
			</div>
			<button type="submit" class="btn btn--primary">Create Position</button>
		</form>
	{/if}

	<div class="page-content">
		<div class="positions-list">
			{#each data.positions as position}
				<a href="/society/officers/{position.position_id}" class="position-item card-border">
					<div class="position-info">
						<h3 class="position-name">{position.name}</h3>
						{#if position.description}
							<p class="position-description">{position.description}</p>
						{/if}
						<p class="position-meta">Term limit: {position.term_limit_years} {position.term_limit_years === 1 ? 'year' : 'years'}</p>
					</div>
					<div class="position-status">
						{#if position.current_person_id}
							<div class="status-filled">
								<span class="status-label">Current Officer</span>
								<span class="status-name">{position.given_name} {position.surname}</span>
							</div>
						{:else}
							<div class="status-vacant">
								<span class="status-label">Vacant</span>
							</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	/* page-container: 1200px matches global, but remove since global handles it */
	/* page-header matches global, remove */
	/* page-header h1, page-header-description, btn--small, form-group: all global */

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-4);
	}

	.position-form {
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

	.form-help {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		margin: 0;
		font-style: italic;
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

	.positions-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.position-item {
		padding: var(--space-4);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.position-item:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.position-info {
		flex: 1;
	}

	.position-name {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-2) 0;
	}

	.position-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-2) 0;
		font-style: italic;
	}

	.position-meta {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.position-status {
		flex-shrink: 0;
	}

	.status-filled,
	.status-vacant {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
	}

	.status-label {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.status-vacant .status-label {
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
