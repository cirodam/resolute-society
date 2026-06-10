<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { children } = $props();
	const person = $derived($page.data.person);
</script>

<div class="app-shell">
	<aside class="sidebar">
		<div class="sidebar__brand">
			The Resolute Society
		</div>

		<nav class="sidebar__nav">
			<a href="/society" class="sidebar-link sidebar-link--active">
				Dashboard
			</a>
			<a href="/society/directory/people" class="sidebar-link">
				Directory
			</a>
			<a href="/society/map" class="sidebar-link">
				Map
			</a>
			<a href="/society/locations" class="sidebar-link">
				Locations
			</a>

			<div class="sidebar-divider"></div>

			<a href="/society/assembly" class="sidebar-link">
				Governance
			</a>
			<a href="/society/calendar" class="sidebar-link">
				Activities
			</a>
			<a href="/society/market" class="sidebar-link">
				Economy
			</a>
			<a href="/society/nutrition" class="sidebar-link">
				Nutrition
			</a>
			<a href="/society/encyclopedia" class="sidebar-link">
				Encyclopedia
			</a>
			<a href="/society/settings" class="sidebar-link">
				Settings
			</a>
			<a href="/society/federation" class="sidebar-link">
				Federation
			</a>

			<div class="sidebar-divider"></div>

			<div class="sidebar-group__label">Personal</div>
			<a href="/profile" class="sidebar-link">
				My Passbook
			</a>
			<a href="/profile/settings" class="sidebar-link">
				My Profile
			</a>
			<a href="/society/messages" class="sidebar-link">
				Messages
			</a>

		</nav>

		<div class="sidebar__footer">
			{#if person}
				<div class="footer-identity">
					<div class="footer-name">{person.name}</div>
					<div class="footer-handle">{person.handle}</div>
				</div>
				<form method="POST" action="/logout" use:enhance class="footer-signout-form">
					<button type="submit" class="footer-signout-button">
						Sign Out
					</button>
				</form>
			{/if}
		</div>
	</aside>

	<div class="app-shell__body">
		<main class="app-shell__content">
			{@render children()}
		</main>
		<footer class="app-footer">
			<span class="app-footer__motto">Human Flourishing is the Point</span>
		</footer>
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 260px;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		overflow-y: auto;
	}

	.sidebar__brand {
		padding: var(--space-6, 2rem) var(--space-4, 1.25rem);
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sidebar__nav {
		flex: 1;
		padding: var(--space-4, 1.25rem) 0;
		padding-left: var(--space-4, 1.25rem);
		display: flex;
		flex-direction: column;
		gap: var(--space-1, 0.25rem);
	}

	.sidebar__footer {
		padding: var(--space-4, 1.25rem);
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.sidebar-link {
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
		display: block;
		transition: color 0.15s;
	}

	.sidebar-divider {
		height: 1px;
		margin: var(--space-3, 0.75rem) var(--space-4, 1.25rem);
	}

	.sidebar-group__label {
		padding: var(--space-3, 0.75rem) var(--space-4, 1.25rem) var(--space-2, 0.5rem);
	}

	.app-shell__body {
		margin-left: 260px;
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	.app-shell__content {
		flex: 1;
	}

	.app-footer {
		padding: 0.75rem 2rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		text-align: center;
	}

	.app-footer__motto {
		font-family: var(--font-label);
		font-size: var(--text-base);
		letter-spacing: 0.25em;
		color: var(--gold);
		text-transform: lowercase;
	}
</style>
