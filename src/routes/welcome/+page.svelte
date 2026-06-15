<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Welcome</title>
</svelte:head>

<div class="letter-shell">
	<article class="letter">
		<p class="society-name">{data.society.name}</p>

		<p class="salutation">Dear {data.person.name},</p>

		<p>Welcome. You are now a member of {data.society.name}, and we're glad you're here.</p>

		<p>
			This society runs on its own internal economy. Society credits are our local currency —
			earned, spent, and held entirely within this community. They don't leave. They are how
			we compensate labor, fund the treasury, and keep the books honest among ourselves.
		</p>

		<p>
			If this society is connected to the federation, you'll also encounter federation credits.
			Those are a shared currency across member societies, used for trade and coordination with
			the outside world. They behave differently from society credits and settle through a
			separate ledger.
		</p>

		<p>
			Governance here happens through the General Assembly and through the unit and position
			structure. If you're ever appointed to a position, you'll find your responsibilities
			described there. If you have questions about how decisions get made, the Assembly is the
			place to start.
		</p>

		<p>
			Take a look around. The directory will show you who else is here. The market is where
			members offer and request goods and services. If you have skills to teach, the courses
			section is open to you.
		</p>

		<p>We're building something worth building. Glad to have you with us.</p>

		<p class="closing">
			In fellowship,<br />
			<span class="closing-name">{data.society.name}</span>
		</p>

		<form method="POST" use:enhance class="letter-action">
			<button type="submit" class="btn btn--primary">Enter the society</button>
		</form>
	</article>
</div>

<style>
	.letter-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: var(--space-8) var(--space-6);
		background:
			radial-gradient(circle at top left, rgba(45, 90, 79, 0.12), transparent 40%),
			linear-gradient(180deg, rgba(12, 16, 14, 0.03), transparent 45%);
	}

	.letter {
		width: 100%;
		max-width: 640px;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.society-name {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--gold);
		margin: 0 0 var(--space-4);
	}

	.salutation {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0;
	}

	.letter p {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.8;
		color: var(--ink);
		margin: 0;
	}

	.closing {
		margin-top: var(--space-2) !important;
		color: var(--ink-mid) !important;
	}

	.closing-name {
		font-weight: 600;
		color: var(--ink);
	}

	.letter-action {
		margin-top: var(--space-4);
	}
</style>
