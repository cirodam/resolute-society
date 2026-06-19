<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';

	let { children } = $props();
	const person = $derived($page.data.person);
	const societyName = $derived($page.data.societyName ?? 'The Resolute Society');
	const path = $derived($page.url.pathname);

	function active(...prefixes: string[]): boolean {
		return prefixes.some(p => p === '/' ? path === p : path === p || path.startsWith(p + '/'));
	}
</script>

<div class="app-shell">
	<aside class="sidebar">
		<div class="sidebar__brand">
			{societyName}
		</div>

		<nav class="sidebar__nav">
			<a href="/dashboard" class="sidebar-link" class:sidebar-link--active={path === '/dashboard'}>
				Dashboard
			</a>
			<a href="/dashboard/directory/people" class="sidebar-link" class:sidebar-link--active={active('/dashboard/directory')}>
				Directory
			</a>
			<a href="/dashboard/map" class="sidebar-link" class:sidebar-link--active={active('/dashboard/map')}>
				Map
			</a>
			<a href="/dashboard/locations" class="sidebar-link" class:sidebar-link--active={active('/dashboard/locations')}>
				Locations
			</a>

			<div class="sidebar-divider"></div>

			<a href="/dashboard/assembly" class="sidebar-link" class:sidebar-link--active={active('/dashboard/assembly', '/dashboard/units', '/dashboard/treasury') || path === '/dashboard/ledger' || path.startsWith('/dashboard/ledger/day')}>
				Governance
			</a>
			<a href="/dashboard/calendar" class="sidebar-link" class:sidebar-link--active={active('/dashboard/calendar', '/dashboard/courses')}>
				Activities
			</a>
			<a href="/dashboard/market" class="sidebar-link" class:sidebar-link--active={active('/dashboard/market')}>
				Market
			</a>
			<a href="/dashboard/nutrition" class="sidebar-link" class:sidebar-link--active={active('/dashboard/nutrition')}>
				Nutrition
			</a>
			<a href="/dashboard/encyclopedia" class="sidebar-link" class:sidebar-link--active={active('/dashboard/encyclopedia', '/dashboard/guides')}>
				Encyclopedia
			</a>
			<a href="/dashboard/settings" class="sidebar-link" class:sidebar-link--active={active('/dashboard/settings')}>
				Settings
			</a>
			<a href="/dashboard/federation" class="sidebar-link" class:sidebar-link--active={active('/dashboard/federation')}>
				Federation
			</a>

			<div class="sidebar-divider"></div>

			<div class="sidebar-group__label">Personal</div>
			<a href="/profile" class="sidebar-link" class:sidebar-link--active={path === '/profile'}>
				My Passbook
			</a>
			<a href="/profile/settings" class="sidebar-link" class:sidebar-link--active={active('/profile/settings')}>
				My Profile
			</a>
			<a href="/dashboard/messages" class="sidebar-link" class:sidebar-link--active={active('/dashboard/messages')}>
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
