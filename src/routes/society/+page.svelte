<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
	let showForm = $state(false);

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function isExpiringSoon(expiresAt: string): boolean {
		return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
	}
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display society-title">
			{#if society.name.toLowerCase().includes(' of ')}
				{@const idx = society.name.toLowerCase().indexOf(' of ')}
				{society.name.slice(0, idx)}<br><span class="title-of">{society.name.slice(idx + 1)}</span>
			{:else}
				{society.name}
			{/if}
		</h1>
	</div>

	<div class="page-content">
		<section class="bulletin-section">
			<div class="bulletin-header">
				<h2 class="section-title">Bulletin Board</h2>
				<button
					class="btn btn--primary"
					onclick={() => (showForm = !showForm)}
				>
					{showForm ? 'Cancel' : 'New Post'}
				</button>
			</div>

			{#if showForm}
				<div class="post-form card-border">
					<Alert type="success" message={form?.success ? 'Post created!' : null} />
					<Alert type="error" message={form?.error} />

					<form method="POST" action="?/createPost" use:enhance>
						<div class="form-group">
							<label for="title">Title</label>
							<input
								id="title"
								name="title"
								type="text"
								required
								placeholder="Announcement title"
							/>
						</div>

						<div class="form-group">
							<label for="body">Message</label>
							<textarea
								id="body"
								name="body"
								rows="4"
								required
								placeholder="What would you like to share?"
							></textarea>
						</div>

						<button type="submit" class="btn btn--primary">
							Post
						</button>
					</form>
				</div>
			{/if}

			<div class="posts-list">
				{#if data.posts.length === 0}
					<div class="board-empty">
						<p class="board-empty-message">No posts yet. Be the first to post.</p>
					</div>
				{:else}
					{#each data.posts as post}
						<a href="/society/bulletin/{post.id}" class="post-card card-border">
							{#if isExpiringSoon(post.expires_at)}
								<p class="expiry-warning">Expires today</p>
							{/if}
							<div class="post-header">
								<h3 class="post-title">{post.title}</h3>
								<span class="post-date">{formatDate(post.created_at)}</span>
							</div>
							<p class="post-body">{post.body}</p>
							<div class="post-footer">
								<span class="post-author">
									{post.author_given_name} {post.author_surname} <span class="author-handle">{post.author_handle}</span>
								</span>
							</div>
						</a>
					{/each}
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.page-header {
		text-align: center;
	}

	.society-title {
		margin: 0 0 var(--space-2) 0;
	}

	.title-of {
		font-size: 0.65em;
		color: var(--ink-mid);
		letter-spacing: 0.08em;
	}

	.bulletin-section {
		margin-bottom: var(--space-8);
	}

	.bulletin-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.post-form {
		padding: var(--space-5);
		margin-bottom: var(--space-4);
	}

	/* form-group has extra margin-bottom: space-4 here */
	.form-group {
		margin-bottom: var(--space-4);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.board-empty {
		border: 1.5px dashed var(--border);
		border-radius: 4px;
		padding: var(--space-10) var(--space-6);
		text-align: center;
		background: var(--tint-green-mid);
	}

	.board-empty-message {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		margin: 0;
	}

	.post-card {
		padding: var(--space-5);
		display: block;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
		overflow: hidden;
	}

	.expiry-warning {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		color: var(--danger);
		margin: 0 0 var(--space-3) 0;
	}

	.post-card:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.post-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}

	.post-title {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0;
		color: var(--ink);
	}

	.post-date {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
		white-space: nowrap;
	}

	.post-body {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink);
		line-height: 1.7;
		margin: 0 0 var(--space-4) 0;
		white-space: pre-wrap;
	}

	.post-footer {
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-3);
	}

	.post-author {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.author-handle {
		color: var(--ink-faint);
	}


</style>
