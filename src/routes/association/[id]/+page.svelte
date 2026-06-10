<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import TabNav from '$lib/components/TabNav.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const association = $derived(data.association);
	const members = $derived(data.members);

	let showSendCredits = $state(false);
	let showCompose = $state(false);
	let showAddMember = $state(false);
	let inboxView = $state<'inbox' | 'sent'>('inbox');

	function fmtDate(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
		});
	}

	function senderLabel(msg: typeof data.inbox[0]) {
		if (msg.sender_association_name) return `${msg.sender_association_name} (via ${msg.sender_given_name} ${msg.sender_surname})`;
		return `${msg.sender_given_name} ${msg.sender_surname} (${msg.sender_handle})`;
	}

	function recipientLabel(msg: typeof data.sent[0]) {
		if (msg.recipient_association_name) return msg.recipient_association_name;
		if (msg.recipient_given_name) return `${msg.recipient_given_name} ${msg.recipient_surname}`;
		return '—';
	}
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display association-name">{association.name}</h1>
		<p class="association-handle">{association.handle}</p>
		<div class="association-meta">
			{#if association.special_type === 'college'}
				<span class="meta-badge t-label">College</span>
			{/if}
			{#if association.type}
				<span class="meta-badge t-label">{association.type}</span>
			{/if}
			<span class="meta-link">
				<a href="/society">{association.society_name}</a>
			</span>
		</div>
	</div>

	<div class="page-content">
		{#if association.location_name}
			<section class="info-section">
				<h2 class="section-title">Location</h2>
				<div class="location-block">
					<span class="location-name">{association.location_name}</span>
					{#if association.location_address}
						<span class="location-address">{association.location_address}</span>
					{/if}
					<a href="/society/map" class="location-map-link">View on map →</a>
				</div>
			</section>
		{/if}

		<!-- Credits -->
		<section class="info-section">
			<div class="section-header">
				<h2 class="section-title">Credits</h2>
				{#if data.isMember}
					<button class="btn btn--secondary btn--small" onclick={() => showSendCredits = !showSendCredits}>
						{showSendCredits ? 'Cancel' : 'Send Credits'}
					</button>
				{/if}
			</div>

			<div class="credits-grid">
				<div class="credit-item">
					<span class="credit-label t-label">Society</span>
					<span class="credit-amount t-numeric">{association.society_credits.toFixed(2)}</span>
				</div>
				<div class="credit-item">
					<span class="credit-label t-label">Federation</span>
					<span class="credit-amount t-numeric">{association.federation_credits.toFixed(2)}</span>
				</div>
			</div>

			{#if showSendCredits}
				<form method="POST" action="?/sendCredits" use:enhance class="action-form card-border">
					{#if form?.creditsError}
						<p class="form-error">{form.creditsError}</p>
					{/if}
					{#if form?.creditsSent}
						<p class="form-success">Credits sent.</p>
					{/if}
					<div class="form-row">
						<div class="form-group">
							<label for="cred-to">Recipient (handle or handle@society)</label>
							<input type="text" id="cred-to" name="toPrincipal" required class="input" placeholder="handle or handle@society" />
						</div>
						<div class="form-group">
							<label for="cred-amount">Amount</label>
							<input type="number" id="cred-amount" name="amount" min="0.01" step="0.01" required class="input" />
						</div>
					</div>
					<button type="submit" class="btn btn--primary">Send</button>
				</form>
			{/if}
		</section>

		<!-- Members -->
		<section class="info-section">
			<div class="section-header">
				<h2 class="section-title">Members ({members.length})</h2>
				{#if data.canManageMembers}
					<button class="btn btn--secondary btn--small" onclick={() => showAddMember = !showAddMember}>
						{showAddMember ? 'Cancel' : '+ Add Member'}
					</button>
				{/if}
			</div>

			{#if showAddMember}
				<form method="POST" action="?/addMember" use:enhance class="action-form card-border">
					{#if form?.memberError}
						<p class="form-error">{form.memberError}</p>
					{/if}
					{#if form?.memberAdded}
						<p class="form-success">Member added.</p>
					{/if}
					<div class="form-row">
						<div class="form-group">
							<label for="add-handle">Member handle</label>
							<input type="text" id="add-handle" name="handle" required class="input" placeholder="memberhandle" />
						</div>
						<button type="submit" class="btn btn--primary add-btn">Add</button>
					</div>
				</form>
			{/if}

			{#if members.length > 0}
				<div class="items-list">
					{#each members as member}
						<div class="list-item-row">
							<a href="/person/{member.id}" class="list-item-link">
								<div class="list-item">
									<span class="item-name">{member.given_name} {member.surname}</span>
									<span class="item-handle">{member.handle}</span>
									<span class="item-badge t-label">{member.membership_status}</span>
								</div>
							</a>
							{#if data.canManageMembers}
								<form method="POST" action="?/removeMember" use:enhance class="remove-form">
									<input type="hidden" name="person_id" value={member.id} />
									<button type="submit" class="btn-ghost-sm">Remove</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<EmptyState message="No members yet." />
			{/if}
		</section>

		<!-- Messages (members only) -->
		{#if data.isMember}
			<section class="info-section">
				<div class="section-header">
					<h2 class="section-title">Messages</h2>
					<button class="btn btn--secondary btn--small" onclick={() => showCompose = !showCompose}>
						{showCompose ? 'Cancel' : 'Compose'}
					</button>
				</div>

				{#if showCompose}
					<form method="POST" action="?/sendMessage" use:enhance class="action-form card-border">
						{#if form?.messageError}
							<p class="form-error">{form.messageError}</p>
						{/if}
						{#if form?.messageSent}
							<p class="form-success">Message sent.</p>
						{/if}
						<div class="form-group">
							<label for="msg-to">To (handle or handle@society)</label>
							<input type="text" id="msg-to" name="recipient" required class="input" placeholder="handle or handle@society" />
						</div>
						<div class="form-group">
							<label for="msg-subject">Subject</label>
							<input type="text" id="msg-subject" name="subject" required class="input" />
						</div>
						<div class="form-group">
							<label for="msg-body">Message</label>
							<textarea id="msg-body" name="body" required class="textarea" rows="4"></textarea>
						</div>
						<button type="submit" class="btn btn--primary">Send</button>
					</form>
				{/if}

				<TabNav
					tabs={[
						{ value: 'inbox', label: `Inbox (${data.inbox.length})` },
						{ value: 'sent', label: `Sent (${data.sent.length})` }
					]}
					active={inboxView}
					onchange={(v) => (inboxView = v as 'inbox' | 'sent')}
				/>

				{#if inboxView === 'inbox'}
					{#if data.inbox.length === 0}
						<EmptyState message="No messages." />
					{:else}
						<div class="msg-list card-border">
							{#each data.inbox as msg}
								<div class="msg-row">
									<div class="msg-meta">
										<span class="msg-from">{senderLabel(msg)}</span>
										<span class="msg-date">{fmtDate(msg.created_at)}</span>
									</div>
									<div class="msg-subject">{msg.subject}</div>
									<div class="msg-body-preview">{msg.body}</div>
								</div>
							{/each}
						</div>
					{/if}
				{:else}
					{#if data.sent.length === 0}
						<EmptyState message="No sent messages." />
					{:else}
						<div class="msg-list card-border">
							{#each data.sent as msg}
								<div class="msg-row">
									<div class="msg-meta">
										<span class="msg-from">To: {recipientLabel(msg)}</span>
										<span class="msg-date">{fmtDate(msg.created_at)}</span>
									</div>
									<div class="msg-subject">{msg.subject}</div>
									<div class="msg-body-preview">{msg.body}</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
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

	.association-name {
		margin: 0 0 var(--space-2) 0;
	}

	.association-handle {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		color: var(--ink-mid);
		margin: 0 0 var(--space-3) 0;
	}

	.association-meta {
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

	.info-section {
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-4);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.section-title {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0;
	}

	.credits-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
		margin-bottom: var(--space-4);
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

	.action-form {
		padding: var(--space-4);
		margin-top: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background: var(--surface);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 140px;
		gap: var(--space-3);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.form-group label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink-mid);
	}

	.input,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
	}

	.textarea { resize: vertical; }

	.form-error {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--error, #b00);
		margin: 0;
	}

	.form-success {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--gold);
		margin: 0;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.list-item-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.list-item-link {
		display: block;
		flex: 1;
		text-decoration: none;
		color: inherit;
		transition: background 0.15s;
		padding: var(--space-2);
		margin: calc(var(--space-2) * -1);
		border-radius: 2px;
	}

	.list-item-link:hover {
		background: var(--tint-gold);
	}

	.list-item {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.remove-form {
		flex-shrink: 0;
	}

	.btn-ghost-sm {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		padding: var(--space-1) var(--space-2);
		background: none;
		border: 1px solid var(--border-faint);
		color: var(--ink-faint);
		cursor: pointer;
	}

	.btn-ghost-sm:hover {
		border-color: var(--border);
		color: var(--ink-mid);
	}

	.add-btn {
		align-self: flex-end;
	}

	.item-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
	}

	.item-handle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.item-badge {
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
		font-size: var(--text-xs);
	}

	.location-block {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.location-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink);
	}

	.location-address {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.location-map-link {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--gold);
		margin-top: 0.25rem;
	}

	.msg-list {
		display: flex;
		flex-direction: column;
	}

	.msg-row {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--border-faint);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.msg-row:last-child { border-bottom: none; }

	.msg-meta {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.msg-from {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-mid);
	}

	.msg-date {
		font-family: var(--font-mono, monospace);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		white-space: nowrap;
	}

	.msg-subject {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
	}

	.msg-body-preview {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		white-space: pre-wrap;
	}

</style>
