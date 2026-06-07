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
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display person-name">{person.given_name} {person.surname}</h1>
		<p class="person-handle">{person.handle}</p>
		<div class="person-meta">
			{#if person.sortition_number}
				<span class="meta-badge sortition-badge t-label">
					Sortition #{person.sortition_number}
				</span>
			{/if}
			<span class="meta-badge t-label">{person.membership_status}</span>
			<span class="meta-link">
				<a href="/society">{person.society_name}</a>
			</span>
			<span class="meta-link">
				<a href="/person/{person.id}/print">Print record</a>
			</span>
		</div>
	</div>

	<div class="page-content">
		{#if form?.statusSuccess}
			<div class="success-message">Membership status updated successfully</div>
		{/if}

		{#if form?.statusError}
			<div class="error-message">{form.statusError}</div>
		{/if}

		<section class="info-section">
			<div class="section-header">
				<h2 class="section-title t-prose">Membership Status</h2>
				<button
					class="btn btn--secondary btn--small"
					onclick={() => isEditingStatus = !isEditingStatus}
				>
					{isEditingStatus ? 'Cancel' : 'Change Status'}
				</button>
			</div>

			{#if isEditingStatus}
				<form method="POST" action="?/updateMembershipStatus" use:enhance class="status-form">
					<select name="status" required class="input status-select">
						<option value="provisional" selected={person.membership_status === 'provisional'}>Provisional</option>
						<option value="full" selected={person.membership_status === 'full'}>Full</option>
						<option value="suspended" selected={person.membership_status === 'suspended'}>Suspended</option>
						<option value="inactive" selected={person.membership_status === 'inactive'}>Inactive</option>
					</select>
					<button type="submit" class="btn btn--primary">Update Status</button>
				</form>
			{:else}
				<p class="status-display">{person.membership_status}</p>
			{/if}
		</section>

		{#if person.bio || isOwnProfile}
			<section class="bio-section">
				<div class="section-header">
					<h2 class="section-title t-prose">Biography</h2>
					{#if isOwnProfile}
						<button
							class="btn btn--secondary btn--small"
							onclick={() => {
								isEditingBio = !isEditingBio;
								if (!isEditingBio) bioValue = person.bio || '';
							}}
						>
							{isEditingBio ? 'Cancel' : 'Edit'}
						</button>
					{/if}
				</div>

				{#if isEditingBio}
					<form method="POST" action="?/updateBio" use:enhance class="bio-form">
						<textarea
							name="bio"
							class="bio-textarea input"
							rows="6"
							placeholder="Write a brief biography..."
							bind:value={bioValue}
						></textarea>
						<button type="submit" class="btn btn--primary">Save Biography</button>
					</form>
				{:else if person.bio}
					<p class="bio-text">{person.bio}</p>
				{:else}
					<p class="empty-state">No biography yet.</p>
				{/if}
			</section>
		{/if}

		<section class="info-section">
			<h2 class="section-title t-prose">Credits</h2>
			<div class="credits-grid">
				<div class="credit-item">
					<span class="credit-label t-label">Society</span>
					<span class="credit-amount t-numeric">{person.society_credits.toFixed(2)}</span>
				</div>
				<div class="credit-item">
					<span class="credit-label t-label">Federation</span>
					<span class="credit-amount t-numeric">{person.federation_credits.toFixed(2)}</span>
				</div>
			</div>
		</section>

		{#if person.dob}
			<section class="info-section">
				<h2 class="section-title t-prose">Details</h2>
				<p class="detail-item"><strong>Date of Birth:</strong> {person.dob}</p>
			</section>
		{/if}

		{#if associations.length > 0}
			<section class="info-section">
				<h2 class="section-title t-prose">Associations ({associations.length})</h2>
				<div class="items-list">
					{#each associations as association}
						<div class="list-item">
							<span class="item-name">{association.name}</span>
							{#if association.is_college}
								<span class="item-badge t-label">College</span>
							{/if}
							{#if association.type}
								<span class="item-badge t-label">{association.type}</span>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

	</div>
</div>

<style>
	.page-container {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		margin-bottom: var(--space-8);
		text-align: center;
	}

	.person-name {
		margin: 0 0 var(--space-2) 0;
	}

	.person-handle {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		color: var(--ink-mid);
		margin: 0 0 var(--space-3) 0;
	}

	.person-meta {
		display: flex;
		justify-content: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.meta-badge {
		padding: var(--space-1) var(--space-3);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		font-size: var(--text-xs);
	}

	.sortition-badge {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.meta-link a {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--gold);
	}

	.page-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.bio-section {
		padding-bottom: var(--space-4);
	}

	.bio-text {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	.bio-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.bio-textarea {
		resize: vertical;
		min-height: 120px;
		font-family: var(--font-prose);
		line-height: 1.5;
	}

	/* success-message has different styling here (tint-green/border-faint vs accent-lt/accent) — keep local */
	.success-message {
		background: var(--tint-green);
		color: var(--green, #2d5016);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
		border: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	/* error-message has different styling here (surface bg / border-faint) — keep local */
	.error-message {
		background: var(--surface);
		color: var(--danger);
		padding: var(--space-3);
		margin-bottom: var(--space-4);
		border: 1px solid var(--border-faint);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.status-form {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}

	.status-select {
		flex: 1;
		max-width: 200px;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.status-display {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		margin: 0;
		text-transform: capitalize;
	}

	.info-section {
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-4);
	}

	.section-title {
		font-weight: 600;
		margin: 0 0 var(--space-4) 0;
	}

	.section-header .section-title {
		margin: 0;
	}

	.section-header .btn {
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* empty-state has extra font-size: var(--text-sm) override */
	.empty-state {
		font-size: var(--text-sm);
	}

	.credits-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
	}

	.credit-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	.credit-label {
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.credit-amount {
		font-size: var(--text-2xl);
		color: var(--ink);
	}

	.detail-item {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		margin: 0 0 var(--space-2) 0;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.list-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.item-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
	}

	.item-badge {
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		font-size: var(--text-xs);
	}

</style>
