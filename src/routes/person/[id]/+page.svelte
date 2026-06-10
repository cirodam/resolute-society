<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const person = $derived(data.person);
	const associations = $derived(data.associations);
	const isOwnProfile = $derived(data.isOwnProfile);

	let isEditingBio = $state(false);
	let bioValue = $state('');
	let isEditingStatus = $state(false);

	function formatDob(dob: string): string {
		return new Date(dob + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric', month: 'long', day: 'numeric'
		});
	}
</script>

<div class="page-container">

	<!-- ── IDENTITY HEADER ── -->
	<header class="person-header">
		<div class="person-name-block">
			<h1 class="t-display person-name">{person.given_name} {person.surname}</h1>
			<p class="person-handle">{person.handle}</p>
		</div>
		<div class="person-chips">
			<span class="chip t-label chip--status">{person.membership_status.replace('_', ' ')}</span>
			{#if person.sortition_number}
				<span class="chip t-label chip--sortition">#{person.sortition_number}</span>
			{/if}
			{#if person.location_name}
				<span class="chip chip--location">{person.location_name}</span>
			{/if}
			<a href="/person/{person.id}/print" class="chip chip--link">Print record</a>
		</div>
	</header>

	{#if form?.statusSuccess}
		<div class="feedback feedback--ok">Membership status updated.</div>
	{/if}
	{#if form?.statusError}
		<div class="feedback feedback--err">{form.statusError}</div>
	{/if}
	{#if form?.deleteError}
		<div class="feedback feedback--err">{form.deleteError}</div>
	{/if}

	<!-- ── BIO ── -->
	{#if person.bio || isOwnProfile}
		<section class="bio-section">
			{#if isEditingBio}
				<form method="POST" action="?/updateBio" use:enhance class="bio-form"
					onsubmit={() => { isEditingBio = false; }}>
					<textarea
						name="bio"
						class="bio-textarea"
						rows="6"
						placeholder="Write a brief biography..."
						bind:value={bioValue}
					></textarea>
					<div class="bio-actions">
						<button type="submit" class="btn btn--primary">Save</button>
						<button type="button" class="btn" onclick={() => { isEditingBio = false; bioValue = person.bio || ''; }}>Cancel</button>
					</div>
				</form>
			{:else if person.bio}
				<p class="bio-text">{person.bio}</p>
				{#if isOwnProfile}
					<button class="bio-edit-btn" onclick={() => { isEditingBio = true; bioValue = person.bio || ''; }}>
						Edit biography
					</button>
				{/if}
			{:else}
				<button class="bio-add-btn" onclick={() => { isEditingBio = true; bioValue = ''; }}>
					+ Add biography
				</button>
			{/if}
		</section>
	{/if}

	<!-- ── FACTS ROW ── -->
	{#if person.dob}
		<div class="facts-row">
			{#if person.dob}
				<div class="fact">
					<span class="fact-label t-label">Born</span>
					<span class="fact-value">{formatDob(person.dob)}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── CREDITS ── -->
	<div class="credits-row">
		<div class="credit-item">
			<span class="credit-label t-label">Society Credits</span>
			<span class="credit-amount t-numeric">{person.society_credits.toFixed(2)}</span>
		</div>
		<div class="credit-divider"></div>
		<div class="credit-item">
			<span class="credit-label t-label">Federation Credits</span>
			<span class="credit-amount t-numeric">{person.federation_credits.toFixed(2)}</span>
		</div>
	</div>

	<!-- ── ASSOCIATIONS ── -->
	{#if associations.length > 0}
		<section class="assoc-section">
			<h2 class="assoc-heading t-label">Associations</h2>
			<div class="assoc-list">
				{#each associations as assoc}
					<div class="assoc-item">
						<span class="assoc-name">{assoc.name}</span>
						{#if assoc.is_college}
							<span class="assoc-badge t-label">College</span>
						{/if}
						{#if assoc.type}
							<span class="assoc-badge t-label">{assoc.type}</span>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── ADMINISTRATION ── -->
	<div class="admin-zone">
		<span class="admin-eyebrow t-label">Administration</span>

		<div class="admin-status">
			{#if isEditingStatus}
				<form method="POST" action="?/updateMembershipStatus" use:enhance class="status-form"
					onsubmit={() => { isEditingStatus = false; }}>
					<select name="status" required class="status-select">
						<option value="provisional" selected={person.membership_status === 'provisional'}>Provisional</option>
						<option value="full" selected={person.membership_status === 'full'}>Full</option>
						<option value="suspended" selected={person.membership_status === 'suspended'}>Suspended</option>
						<option value="inactive" selected={person.membership_status === 'inactive'}>Inactive</option>
					</select>
					<button type="submit" class="btn btn--primary">Update</button>
					<button type="button" class="btn" onclick={() => isEditingStatus = false}>Cancel</button>
				</form>
			{:else}
				<div class="status-row">
					<span class="status-label t-label">Membership Status</span>
					<span class="status-value">{person.membership_status.replace('_', ' ')}</span>
					<button class="status-change-btn" onclick={() => isEditingStatus = true}>Change</button>
				</div>
			{/if}
		</div>

		{#if data.canDelete}
			<div class="danger-zone">
				<p class="danger-desc">
					Removes this member from the society. Their endowment credit will be burned;
					any remaining balance transfers to the treasury.
				</p>
				<form method="POST" action="?/deleteMember" use:enhance>
					<button
						type="submit"
						class="btn btn--danger"
						onclick={(e) => {
							if (!confirm(`Remove ${person.given_name} ${person.surname}? This cannot be undone.`)) {
								e.preventDefault();
							}
						}}
					>
						Remove Member
					</button>
				</form>
			</div>
		{/if}
	</div>

</div>

<style>
	.page-container {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-6) var(--space-10);
		display: flex;
		flex-direction: column;
		gap: var(--space-8);
	}

	/* ── HEADER ── */
	.person-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-6);
		border: 1px solid var(--border-faint);
		background: var(--paper);
		box-shadow: 0 8px 24px rgba(21, 28, 26, 0.05);
	}

	.person-name-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.person-name {
		margin: 0;
		line-height: 1.08;
	}

	.person-handle {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.person-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	.chip {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border-faint);
		background: var(--tint-green);
		color: var(--ink-mid);
		text-transform: capitalize;
	}

	.chip--sortition {
		background: var(--tint-gold);
		color: var(--gold);
		border-color: transparent;
	}

	.chip--location {
		background: transparent;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-style: italic;
		color: var(--ink-mid);
		border: none;
		padding-left: 0;
		letter-spacing: 0;
	}

	.chip--link {
		background: transparent;
		border-color: transparent;
		color: var(--gold);
		text-decoration: none;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		letter-spacing: 0;
		padding-left: 0;
	}

	.chip--link:hover { color: var(--gold-hover); }

	/* ── FEEDBACK ── */
	.feedback {
		padding: var(--space-3) var(--space-5);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border-left: 3px solid transparent;
	}

	.feedback--ok {
		background: var(--tint-green);
		color: var(--accent);
		border: 1px solid var(--border-faint);
		border-left-color: var(--accent);
	}

	.feedback--err {
		background: var(--danger-lt);
		color: var(--danger);
		border: 1px solid var(--danger);
		border-left-color: var(--danger);
	}

	/* ── BIO ── */
	.bio-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-5);
		background: var(--surface);
		border: 1px solid var(--border-faint);
		border-left: 3px solid var(--gold);
	}

	.bio-text {
		font-family: var(--font-prose);
		font-size: var(--text-body);
		line-height: 1.9;
		color: var(--ink);
		margin: 0;
		white-space: pre-wrap;
		max-width: 68ch;
	}

	.bio-edit-btn,
	.bio-add-btn {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--gold);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
	}

	.bio-edit-btn:hover,
	.bio-add-btn:hover { color: var(--gold-hover); }

	.bio-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 68ch;
	}

	.bio-textarea {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.6;
		padding: var(--space-4);
		border: 1px solid var(--border);
		background: var(--paper);
		resize: vertical;
		min-height: 140px;
		width: 100%;
		box-sizing: border-box;
	}

	.bio-actions {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	/* ── FACTS ── */
	.facts-row {
		display: flex;
		gap: var(--space-6);
		flex-wrap: wrap;
		padding: var(--space-5);
		border: 1px solid var(--border-faint);
		background: var(--surface);
	}

	.fact {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.fact-label {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		letter-spacing: 0.12em;
	}

	.fact-value {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink);
	}

	/* ── CREDITS ── */
	.credits-row {
		display: flex;
		align-items: center;
		gap: var(--space-8);
		padding: var(--space-6);
		border: 1px solid var(--border-faint);
		background: var(--surface);
		box-shadow: 0 2px 10px rgba(21, 28, 26, 0.03);
	}

	.credit-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.credit-label {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		letter-spacing: 0.12em;
	}

	.credit-amount {
		font-size: var(--text-xl);
		color: var(--ink);
		line-height: 1;
	}

	.credit-divider {
		width: 1px;
		height: 3rem;
		background: var(--border-faint);
	}

	/* ── ASSOCIATIONS ── */
	.assoc-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-5);
		border: 1px solid var(--border-faint);
		background: var(--surface);
	}

	.assoc-heading {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		letter-spacing: 0.2em;
	}

	.assoc-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.assoc-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		flex-wrap: wrap;
		padding: var(--space-3) var(--space-4);
		background: rgba(45, 90, 79, 0.03);
		border: 1px solid var(--border-faint);
	}

	.assoc-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink);
	}

	.assoc-badge {
		font-size: var(--text-xs);
		letter-spacing: 0.06em;
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		color: var(--ink-mid);
	}

	/* ── ADMIN ZONE ── */
	.admin-zone {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		padding: var(--space-6);
		border: 1px solid rgba(122, 46, 46, 0.2);
		background: var(--surface);
	}

	.admin-eyebrow {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		letter-spacing: 0.2em;
	}

	.status-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.status-label {
		font-size: var(--text-xs);
		color: var(--ink-faint);
		letter-spacing: 0.12em;
	}

	.status-value {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		text-transform: capitalize;
	}

	.status-change-btn {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--gold);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.status-change-btn:hover { color: var(--gold-hover); }

	.status-form {
		display: flex;
		gap: var(--space-3);
		align-items: center;
		flex-wrap: wrap;
	}

	.status-select {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--paper);
		max-width: 200px;
	}

	.danger-zone {
		border-top: 1px solid var(--border-faint);
		padding-top: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.danger-desc {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		line-height: 1.6;
		margin: 0;
		max-width: 52ch;
	}

	@media (max-width: 720px) {
		.page-container {
			padding: var(--space-6) var(--space-4) var(--space-8);
			gap: var(--space-6);
		}

		.person-header,
		.bio-section,
		.credits-row,
		.assoc-section,
		.admin-zone,
		.facts-row {
			padding: var(--space-4);
		}

		.credits-row {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-4);
		}

		.credit-divider {
			width: 100%;
			height: 1px;
		}

		.bio-text {
			font-size: var(--text-base);
			line-height: 1.75;
		}
	}
</style>
