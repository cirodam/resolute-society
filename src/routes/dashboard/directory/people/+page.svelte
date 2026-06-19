<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { hasPermission } from '$lib/client/permissions';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<section class="directory-section">
	<div class="section-header">
		<h2 class="section-title">People ({data.total})</h2>
		<div class="header-actions">
			<a href="/dashboard/directory/people/print" class="btn btn--secondary btn--small">Print Roster</a>
			{#if hasPermission(data.permissions, 'membership.create_member')}
				<a href="/dashboard/directory/people/new" class="btn btn--secondary btn--small">Add Member</a>
				<form method="POST" action="?/seedRandomPerson" use:enhance style="display: inline;">
					<button type="submit" class="btn btn--secondary btn--small">Seed Random Person</button>
				</form>
			{/if}
			{#if hasPermission(data.permissions, 'membership.run_sortition')}
				<form method="POST" action="?/runSortition" use:enhance style="display: inline;">
					<button type="submit" class="btn btn--secondary btn--small">Shuffle Sortition Numbers</button>
				</form>
			{/if}
		</div>
	</div>

	<form method="GET" class="search-form card-border">
		<label for="person_q">Search People</label>
		<div class="search-row">
			<input
				id="person_q"
				name="person_q"
				type="search"
				value={data.personQuery}
				placeholder="Name, handle, or status"
				class="input"
			/>
			<button type="submit" class="btn btn--secondary btn--small">Search</button>
		</div>
	</form>

	<Alert type="success" message={form?.seedSuccess ? `Seeded member ${form.seededName} (${form.seededHandle})` : null} />
	<Alert type="success" message={form?.sortitionSuccess ? `Assigned sortition numbers to ${form.count} members` : null} />
	<Alert type="error" message={form?.sortitionError} />

	{#if data.members.length === 0}
		<EmptyState message="No members match this search." />
	{:else}
		<div class="items-grid">
			{#each data.members as member}
				<div class="member-card card-border">
					<a href="/person/{member.id}" class="member-link">
						<div class="member-header">
							<div class="member-main">
								{#if member.sortition_number}
									<span class="sortition-number">#{member.sortition_number}</span>
								{/if}
								<h3 class="member-name">{member.given_name} {member.surname}</h3>
							</div>
							<span class="member-status t-label">{member.membership_status}</span>
						</div>
						<p class="member-handle">{member.handle}</p>
					</a>
				</div>
			{/each}
		</div>

		<Pagination
			page={data.page}
			totalPages={data.totalPages}
			buildHref={(p) => `?${new URLSearchParams(data.personQuery ? { person_q: data.personQuery, page: String(p) } : { page: String(p) })}`}
		/>
	{/if}
</section>

<style>
	.directory-section {
		margin-bottom: var(--space-8);
	}

	.header-actions {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		flex-wrap: wrap;
	}

	.search-form {
		padding: var(--space-4);
		margin-bottom: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.search-form label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.search-row {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.input {
		flex: 1;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.member-card {
		transition: border-color 0.15s, background 0.15s;
	}

	.member-link {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		text-decoration: none;
		color: inherit;
	}

	.member-card:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.member-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
	}

	.member-main {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		flex: 1;
	}

	.sortition-number {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		color: var(--gold);
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.member-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0;
	}

	.member-status {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.member-handle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

</style>
