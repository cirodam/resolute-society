<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const association = $derived(data.association);
	const members = $derived(data.members);
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
				<h2 class="section-title t-prose">Location</h2>
				<div class="location-block">
					<span class="location-name">{association.location_name}</span>
					{#if association.location_address}
						<span class="location-address">{association.location_address}</span>
					{/if}
					<a href="/society/map" class="location-map-link">View on map →</a>
				</div>
			</section>
		{/if}

		<section class="info-section">
			<h2 class="section-title t-prose">Credits</h2>
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
		</section>

		{#if members.length > 0}
			<section class="info-section">
				<h2 class="section-title t-prose">Members ({members.length})</h2>
				<div class="items-list">
					{#each members as member}
						<a href="/person/{member.id}" class="list-item-link">
							<div class="list-item">
								<span class="item-name">{member.given_name} {member.surname}</span>
								<span class="item-handle">{member.handle}</span>
								<span class="item-badge t-label">{member.membership_status}</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{:else}
			<section class="info-section">
				<h2 class="section-title t-prose">Members</h2>
				<p class="empty-state">No members yet.</p>
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

	.section-title {
		font-weight: 600;
		margin: 0 0 var(--space-4) 0;
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

	.items-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.list-item-link {
		display: block;
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
</style>
