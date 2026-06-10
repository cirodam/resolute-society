<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const post = $derived(data.post);

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'long', day: 'numeric', year: 'numeric'
		});
	}

	function formatTime(dateStr: string) {
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
		});
	}
</script>

<div class="page-container page-container--content">
	<div class="thread-nav">
		<a href="/society" class="back-link">← Bulletin Board</a>
	</div>

	<article class="thread-post card-border">
		<div class="post-header">
			<h1 class="post-title t-display">{post.title}</h1>
			<div class="post-meta">
				<span class="post-author">{post.author_given_name} {post.author_surname} · {post.author_handle}</span>
				<span class="post-date">{formatDate(post.created_at)}</span>
			</div>
		</div>
		<div class="post-body">
			<p>{post.body}</p>
		</div>
	</article>

	<section class="replies-section">
		<h2 class="replies-heading t-label">
			{data.totalReplies} {data.totalReplies === 1 ? 'comment' : 'comments'}
		</h2>

		{#if data.replies.length > 0}
			<div class="replies-list">
				{#each data.replies as reply}
					<div class="reply card-border">
						<div class="reply-meta">
							<span class="reply-author">{reply.author_given_name} {reply.author_surname} · {reply.author_handle}</span>
							<span class="reply-date">{formatTime(reply.created_at)}</span>
						</div>
						<p class="reply-body">{reply.body}</p>
					</div>
				{/each}
			</div>

			{#if data.totalPages > 1}
				<div class="pagination">
					{#if data.page > 1}
						<a href="?page={data.page - 1}" class="btn btn--secondary btn--small">Previous</a>
					{:else}
						<span class="btn btn--secondary btn--small btn--disabled">Previous</span>
					{/if}
					<span class="page-indicator">Page {data.page} of {data.totalPages}</span>
					{#if data.page < data.totalPages}
						<a href="?page={data.page + 1}" class="btn btn--secondary btn--small">Next</a>
					{:else}
						<span class="btn btn--secondary btn--small btn--disabled">Next</span>
					{/if}
				</div>
			{/if}
		{:else}
			<p class="no-replies">No comments yet. Be the first to reply.</p>
		{/if}

		<div class="reply-form-section">
			<h3 class="reply-form-heading t-label">Add a Comment</h3>
			{#if form?.replyError}
				<p class="form-error">{form.replyError}</p>
			{/if}
			<form method="POST" action="?/reply" use:enhance class="reply-form">
				<textarea
					name="body"
					rows="4"
					placeholder="Write a comment…"
					required
				></textarea>
				<button type="submit" class="btn btn--primary btn--small">Post Comment</button>
			</form>
		</div>
	</section>
</div>

<style>
	.thread-nav {
		margin-bottom: var(--space-5);
	}

	.back-link {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.08em;
		color: var(--ink-mid);
	}

	.back-link:hover { color: var(--ink); }

	.thread-post {
		padding: var(--space-6);
		margin-bottom: var(--space-8);
	}

	.post-header {
		margin-bottom: var(--space-5);
		padding-bottom: var(--space-4);
		border-bottom: 1px solid var(--border-subtle);
	}

	.post-title { margin: 0 0 var(--space-3) 0; }

	.post-meta {
		display: flex;
		gap: var(--space-4);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.post-body p {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.7;
		margin: 0;
		white-space: pre-wrap;
	}

	.replies-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.replies-heading {
		margin: 0;
	}

	.replies-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.reply {
		padding: var(--space-4);
	}

	.reply-meta {
		display: flex;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-2);
	}

	.reply-author {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
	}

	.reply-date {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		white-space: nowrap;
	}

	.reply-body {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	.no-replies {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
	}

	.page-indicator {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.btn--disabled {
		opacity: 0.4;
		cursor: default;
		pointer-events: none;
	}

	.reply-form-section {
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.reply-form-heading { margin: 0; }

	.reply-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.reply-form textarea {
		resize: vertical;
	}
</style>
