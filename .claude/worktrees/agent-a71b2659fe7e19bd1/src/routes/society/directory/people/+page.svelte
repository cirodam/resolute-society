<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { hasPermission } from '$lib/client/permissions';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<section class="directory-section">
	<div class="section-header">
		<h2 class="section-title t-prose">People ({data.members.length})</h2>
		<div class="header-actions">
			{#if hasPermission(data.permissions, 'membership.create_member')}
				<a href="/society/directory/new" class="btn btn--primary">Add Member</a>
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

	{#if form?.seedSuccess}
		<div class="success-message">Seeded member {form.seededName} ({form.seededHandle})</div>
	{/if}

	{#if form?.sortitionSuccess}
		<div class="success-message">Assigned sortition numbers to {form.count} members</div>
	{/if}

	{#if form?.sortitionError}
		<div class="error-message">{form.sortitionError}</div>
	{/if}

	{#if form?.deleteMemberSuccess}
		<div class="success-message">
			Removed {form.deletedName}. Burned {form.burnAmount.toFixed(2)} credits toward a target of {form.endowmentTarget.toFixed(2)}; moved {form.treasuryRemainder.toFixed(2)} to treasury.
		</div>
	{/if}

	{#if form?.deleteMemberError}
		<div class="error-message">{form.deleteMemberError}</div>
	{/if}

	{#if data.members.length === 0}
		<p class="empty-state">No members match this search.</p>
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

					{#if hasPermission(data.permissions, 'membership.create_member')}
						<form method="POST" action="?/deleteMember" use:enhance class="member-actions-row">
							<input type="hidden" name="person_id" value={member.id} />
							<button
								type="submit"
								class="btn btn--secondary btn--small"
								onclick={(event) => {
									if (!confirm(`Delete ${member.given_name} ${member.surname}? This burns endowment from their balance first.`)) {
										event.preventDefault();
									}
								}}
							>
								Delete Member
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.directory-section {
		margin-bottom: var(--space-8);
	}

	.section-title {
		font-weight: 600;
		margin: 0;
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

	/* success/error-message use tint-green/surface bg + border-faint (different from global) */
	.success-message {
		background: var(--tint-green);
		color: var(--green, #2d5016);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
		border: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.error-message {
		background: var(--surface);
		color: var(--danger);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
		border: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: var(--space-4);
	}

	.member-card {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		transition: border-color 0.15s, background 0.15s;
	}

	.member-link {
		display: block;
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

	.member-actions-row {
		display: flex;
		justify-content: flex-end;
	}
</style>
