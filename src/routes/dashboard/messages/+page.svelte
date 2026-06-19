<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCompose = $state(false);
	let selectedMessage = $state<PageData['messages'][number] | null>(null);

	// Format date helper
	function formatDate(dateStr: string) {
		const date = new Date(dateStr);
		const now = new Date();
		const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		} else if (diffDays < 7) {
			return date.toLocaleDateString('en-US', { weekday: 'short' });
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display">Messages</h1>
		<button type="button" class="btn btn--primary" onclick={() => (showCompose = !showCompose)}>
			{showCompose ? 'Cancel' : 'New Message'}
		</button>
	</div>

	<div class="page-content">
		<!-- Compose Form -->
		{#if showCompose}
			<div class="compose-card card-border">
				<h2 class="t-prose" style="font-weight: 600; margin: 0 0 var(--space-4) 0;">
					New Message
				</h2>

				<Alert type="success" message={form?.sendSuccess ? 'Message sent successfully!' : null} />
				<Alert type="error" message={form?.sendError} />

				<form method="POST" action="?/sendMessage" use:enhance class="compose-form">
					<div class="form-group">
						<label for="recipient">To</label>
						<input
							id="recipient"
							name="recipient"
							type="text"
							placeholder="handle@society-handle"
							required
						/>
						<span class="input-hint">Enter recipient address (e.g., alice@woodworkers)</span>
					</div>

					<div class="form-group">
						<label for="subject">Subject</label>
						<input id="subject" name="subject" type="text" required />
					</div>

					<div class="form-group">
						<label for="body">Message</label>
						<textarea id="body" name="body" rows="8" required></textarea>
					</div>

					<button type="submit" class="btn btn--primary">Send Message</button>
				</form>
			</div>
		{/if}

		<!-- View Tabs -->
		<div class="tabs">
			<a href="?view=inbox" class="tab" class:active={data.view === 'inbox'}>
				Inbox {#if data.unreadCount > 0}<span class="badge">{data.unreadCount}</span>{/if}
			</a>
			<a href="?view=sent" class="tab" class:active={data.view === 'sent'}> Sent </a>
			<a href="?view=archive" class="tab" class:active={data.view === 'archive'}> Archive </a>
		</div>

		<!-- Messages List -->
		<div class="messages-section">
			{#if data.messages.length === 0}
				<EmptyState message="No messages in {data.view}" />
			{:else}
				<div class="messages-list">
					{#each data.messages as message}
						<div
							class="message-item card-border"
							class:unread={!message.read_at && data.view === 'inbox'}
						>
							<button
								type="button"
								class="message-button"
								onclick={() => {
									selectedMessage = selectedMessage?.id === message.id ? null : message;
									// Auto-mark as read when opened
									if (!message.read_at && data.view === 'inbox' && selectedMessage) {
										const form = document.createElement('form');
										form.method = 'POST';
										form.action = '?/markAsRead';
										const input = document.createElement('input');
										input.type = 'hidden';
										input.name = 'message_id';
										input.value = message.id;
										form.appendChild(input);
										document.body.appendChild(form);
										form.requestSubmit();
										document.body.removeChild(form);
									}
								}}
							>
								<div class="message-header">
									<span class="message-from">
										{data.view === 'sent' ? `To: ${message.address}` : message.address}
									</span>
									<span class="message-date">{formatDate(message.created_at)}</span>
								</div>
								<div class="message-subject">{message.subject}</div>
								{#if selectedMessage?.id !== message.id}
									<div class="message-preview">{message.body.substring(0, 100)}...</div>
								{/if}
							</button>

							{#if selectedMessage?.id === message.id}
								<div class="message-body">
									<p>{message.body}</p>
									<div class="message-actions">
										<form method="POST" action="?/archive" use:enhance style="display: inline;">
											<input type="hidden" name="message_id" value={message.id} />
											<button type="submit" class="btn btn--secondary"> Archive </button>
										</form>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<Pagination page={data.page} totalPages={data.totalPages} buildHref={(p) => `?view=${data.view}&page=${p}`} />
		</div>
	</div>
</div>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-8);
	}

	.page-header h1 {
		margin: 0;
	}

	.compose-card {
		padding: var(--space-5);
		margin-bottom: var(--space-6);
	}

	.compose-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.tabs {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
		border-bottom: 1px solid var(--border);
	}

	.tab {
		padding: var(--space-3) var(--space-4);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.1em;
		text-decoration: none;
		color: var(--ink-mid);
		border-bottom: 2px solid transparent;
		transition: all 0.15s;
		position: relative;
	}

	.tab:hover {
		color: var(--ink);
	}

	.tab.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.badge {
		display: inline-block;
		background: var(--accent);
		color: white;
		font-size: var(--text-xs);
		padding: 2px 6px;
		border-radius: 10px;
		margin-left: var(--space-1);
	}

	.messages-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.message-item {
		padding: 0;
		overflow: hidden;
	}

	.message-item.unread {
		border-left: 3px solid var(--accent);
	}

	.message-button {
		width: 100%;
		padding: var(--space-4);
		background: transparent;
		border: none;
		text-align: left;
		cursor: pointer;
		transition: background 0.15s;
	}

	.message-button:hover {
		background: var(--tint-gold);
	}

	.message-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-2);
	}

	.message-from {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
	}

	.message-item.unread .message-from {
		font-weight: 700;
	}

	.message-date {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.message-subject {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		margin-bottom: var(--space-1);
	}

	.message-item.unread .message-subject {
		font-weight: 600;
	}

	.message-preview {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		line-height: 1.5;
	}

	.message-body {
		padding: var(--space-4);
		border-top: 1px solid var(--border-subtle);
		background: var(--tint-gold);
	}

	.message-body p {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.6;
		margin: 0 0 var(--space-4) 0;
		white-space: pre-wrap;
	}

	.message-actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
