<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
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
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display society-title">{society.name}</h1>
		<p class="page-header-description">
			@{society.handle}
		</p>
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
					{#if form?.success}
						<div class="success-message">Post created!</div>
					{/if}

					{#if form?.error}
						<div class="error-message">{form.error}</div>
					{/if}

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
					<p class="empty-state">No posts yet. Be the first to post!</p>
				{:else}
					{#each data.posts as post}
						<article class="post-card card-border">
							<div class="post-header">
								<h3 class="post-title">{post.title}</h3>
								<span class="post-date">{formatDate(post.created_at)}</span>
							</div>
							<p class="post-body">{post.body}</p>
							<div class="post-footer">
								<span class="post-author">
									{post.author_given_name} {post.author_surname} <span class="author-handle">@{post.author_handle}</span>
								</span>
							</div>
						</article>
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

	.post-card {
		padding: var(--space-5);
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
