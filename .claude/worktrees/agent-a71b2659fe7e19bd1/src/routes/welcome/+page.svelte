<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Welcome</title>
</svelte:head>

<div class="welcome-shell">
	<div class="welcome-card card-border">
		<p class="eyebrow t-label">Welcome to {data.society.name}</p>
		<h1 class="t-display">You’re in.</h1>
		<p class="lead t-prose">
			This is your quick orientation. Society credits are local to this society. Federation credits
			flow through the federation when your society is connected.
		</p>

		<div class="info-grid">
			<div class="info-panel">
				<div class="info-title">Society</div>
				<p>Local credits, directory, treasury, governance, and internal activity.</p>
			</div>
			<div class="info-panel">
				<div class="info-title">Federation</div>
				<p>Optional external settlement, messaging, and cross-society coordination.</p>
			</div>
		</div>

		<form method="POST" use:enhance class="welcome-actions">
			<button type="submit" class="btn btn--primary">I understand</button>
		</form>
	</div>
</div>

<style>
	.welcome-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: var(--space-6);
		background:
			radial-gradient(circle at top left, rgba(45, 90, 79, 0.12), transparent 40%),
			linear-gradient(180deg, rgba(12, 16, 14, 0.03), transparent 45%);
	}

	.welcome-card {
		width: 100%;
		max-width: 760px;
		padding: var(--space-8);
		text-align: center;
	}

	.eyebrow {
		margin: 0 0 var(--space-2);
		color: var(--gold);
	}

	h1 {
		margin: 0 0 var(--space-4);
	}

	.lead {
		max-width: 60ch;
		margin: 0 auto var(--space-6);
		color: var(--ink-mid);
		font-size: var(--text-lg);
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
		text-align: left;
	}

	.info-panel {
		padding: var(--space-4);
		border-radius: var(--radius-md, 8px);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
	}

	.info-title {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: var(--space-2);
	}

	.info-panel p {
		margin: 0;
		font-family: var(--font-prose);
		color: var(--ink-mid);
	}

	.welcome-actions {
		display: flex;
		justify-content: center;
	}

	button {
		min-width: 220px;
	}
</style>