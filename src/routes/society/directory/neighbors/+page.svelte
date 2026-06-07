<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDistance(miles: number): string {
		if (miles < 0.1) return 'less than 0.1 miles';
		if (miles < 10) return `${miles.toFixed(2)} miles`;
		return `${miles.toFixed(1)} miles`;
	}
</script>

<div class="neighbors-page">
	{#if !data.hasLocation}
		<div class="no-location card-border">
			<p class="no-location__text">
				Your location is not set. Add it in
				<a href="/profile/settings">profile settings</a>
				to see how far you live from your neighbors.
			</p>
		</div>
	{:else if data.neighbors.length === 0}
		<p class="empty-state">No members within 3 miles of your location.</p>
	{:else}
		<div class="neighbor-list">
			{#each data.neighbors as person}
				<a href="/person/{person.id}" class="neighbor-row card-border">
					<div class="neighbor-identity">
						<span class="neighbor-name">{person.given_name} {person.surname}</span>
						<span class="neighbor-handle">@{person.handle}</span>
						{#if person.location_name}
							<span class="neighbor-location">{person.location_name}</span>
						{/if}
					</div>
					<span class="neighbor-distance">{formatDistance(person.distance_miles)}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.neighbors-page {
		padding: var(--space-5) var(--space-6);
	}

	.no-location {
		padding: var(--space-5);
		max-width: 560px;
	}

	.no-location__text {
		margin: 0;
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		line-height: 1.6;
	}

	.neighbor-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-width: 680px;
	}

	.neighbor-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-4);
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s, background 0.15s;
	}

	.neighbor-row:hover {
		border-color: var(--border-strong);
		background: var(--tint-gold);
	}

	.neighbor-identity {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		flex-wrap: wrap;
		min-width: 0;
	}

	.neighbor-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--ink);
	}

	.neighbor-handle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.neighbor-location {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
	}

	.neighbor-distance {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.empty-state {
		font-family: var(--font-prose);
		color: var(--ink-mid);
		font-style: italic;
	}
</style>
