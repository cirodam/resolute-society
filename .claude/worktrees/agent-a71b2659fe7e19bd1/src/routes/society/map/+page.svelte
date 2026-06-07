<script lang="ts">
	import { enhance } from '$app/forms';
	import SocietyMap from '$lib/components/SocietyMap.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
	let warming = $state(false);
	let hiddenCategories = $state<string[]>([]);

	function toggleCategory(id: string) {
		if (hiddenCategories.includes(id)) {
			hiddenCategories = hiddenCategories.filter(c => c !== id);
		} else {
			hiddenCategories = [...hiddenCategories, id];
		}
	}

	let clickedLat = $state<number | null>(null);
	let clickedLng = $state<number | null>(null);
	let copied = $state<'lat' | 'lng' | null>(null);

	function handleMapClick(lat: number, lng: number) {
		clickedLat = lat;
		clickedLng = lng;
		copied = null;
	}

	async function copyToClipboard(value: string, field: 'lat' | 'lng') {
		await navigator.clipboard.writeText(value);
		copied = field;
		setTimeout(() => (copied = null), 1500);
	}

	// Distance measurement
	let pointAId = $state('');
	let pointBId = $state('');

	type LatLng = { lat: number; lng: number; label: string };

	function resolvePoint(id: string): LatLng | null {
		if (!id) return null;
		if (id === '__clicked__') {
			if (clickedLat === null || clickedLng === null) return null;
			return { lat: clickedLat, lng: clickedLng, label: 'Clicked point' };
		}
		const loc = data.locations.find(l => l.id === id);
		if (loc) return { lat: loc.lat, lng: loc.lng, label: loc.name };
		if (id === '__society__' && society.lat && society.lng) {
			return { lat: society.lat, lng: society.lng, label: society.name };
		}
		return null;
	}

	function haversine(a: LatLng, b: LatLng): number {
		const R = 6371;
		const dLat = (b.lat - a.lat) * Math.PI / 180;
		const dLng = (b.lng - a.lng) * Math.PI / 180;
		const sinDLat = Math.sin(dLat / 2);
		const sinDLng = Math.sin(dLng / 2);
		const c = sinDLat * sinDLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinDLng * sinDLng;
		return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
	}

	const pointA = $derived(resolvePoint(pointAId));
	const pointB = $derived(resolvePoint(pointBId));
	const distanceKm = $derived(pointA && pointB ? haversine(pointA, pointB) : null);
	const distanceMi = $derived(distanceKm !== null ? distanceKm * 0.621371 : null);
	const measureLine = $derived(
		pointA && pointB
			? { a: [pointA.lat, pointA.lng] as [number, number], b: [pointB.lat, pointB.lng] as [number, number] }
			: null
	);
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Map</h1>
		{#if society.address}
			<p class="page-header-description">{society.address}</p>
		{/if}
	</div>

	<div class="map-card card-border">
		<div class="card-header">
			<h2>{society.name}{society.address ? ` · ${society.address}` : ''}</h2>
			<form
				method="POST"
				action="?/warmCache"
				use:enhance={() => {
					warming = true;
					return async ({ update }) => {
						await update();
						warming = false;
					};
				}}
			>
				<button type="submit" class="btn" disabled={warming || !society.lat || !society.lng}>
					{warming ? 'Caching…' : 'Cache Local Tiles'}
				</button>
			</form>
		</div>

		{#if form?.warmSuccess}
			<div class="warm-result warm-result--success">
				Cached {form.fetched} new tile{form.fetched === 1 ? '' : 's'} —
				{form.alreadyCached} already stored{form.failed ? `, ${form.failed} failed` : ''}.
			</div>
		{/if}
		{#if form?.warmError}
			<div class="warm-result warm-result--error">{form.warmError}</div>
		{/if}

		<div class="map-body">
			<SocietyMap societies={[society]} hubAssociations={data.hubAssociations} locations={data.locations} viewType="local" onMapClick={handleMapClick} {measureLine} {hiddenCategories} />
		</div>

		{#if data.categories.length > 0}
			<div class="map-legend">
				{#each data.categories as cat}
					{@const hidden = hiddenCategories.includes(cat.id)}
					<button
						class="legend-item"
						class:legend-item--hidden={hidden}
						onclick={() => toggleCategory(cat.id)}
					>
						<span class="legend-swatch" style="background:{hidden ? 'transparent' : cat.color}; border-color:{cat.color}"></span>
						<span class="legend-label t-label">{cat.name}</span>
					</button>
				{/each}
			</div>
		{/if}

		<div class="coord-capture">
			<div class="coord-fields">
				<div class="coord-field">
					<label class="t-label">Latitude</label>
					<div class="coord-input-row">
						<input type="text" readonly value={clickedLat !== null ? clickedLat.toFixed(6) : ''} placeholder="click map to capture" />
						<button class="btn" disabled={clickedLat === null} onclick={() => copyToClipboard(clickedLat!.toFixed(6), 'lat')}>
							{copied === 'lat' ? 'Copied' : 'Copy'}
						</button>
					</div>
				</div>
				<div class="coord-field">
					<label class="t-label">Longitude</label>
					<div class="coord-input-row">
						<input type="text" readonly value={clickedLng !== null ? clickedLng.toFixed(6) : ''} placeholder="click map to capture" />
						<button class="btn" disabled={clickedLng === null} onclick={() => copyToClipboard(clickedLng!.toFixed(6), 'lng')}>
							{copied === 'lng' ? 'Copied' : 'Copy'}
						</button>
					</div>
				</div>
			</div>
			{#if clickedLat !== null && clickedLng !== null}
				<div class="coord-actions">
					<a href="/society/locations?lat={clickedLat.toFixed(6)}&lng={clickedLng.toFixed(6)}" class="btn btn--primary">
						New Location Here
					</a>
				</div>
			{/if}
		</div>
	</div>

	<div class="distance-card card-border">
		<div class="card-header">
			<h2>Measure Distance</h2>
			{#if distanceKm !== null}
				<span class="distance-result t-numeric">
					{distanceKm.toFixed(2)} km · {distanceMi!.toFixed(2)} mi
				</span>
			{/if}
		</div>
		<div class="distance-body">
			{#snippet pointSelect(label: string, value: string, onchange: (v: string) => void)}
				<div class="point-row">
					<span class="point-label t-label">{label}</span>
					<select value={value} onchange={(e) => onchange((e.target as HTMLSelectElement).value)}>
						<option value="">— select —</option>
						{#if society.lat && society.lng}
							<option value="__society__">{society.name} (society)</option>
						{/if}
						{#if clickedLat !== null}
							<option value="__clicked__">Clicked point ({clickedLat.toFixed(4)}, {clickedLng!.toFixed(4)})</option>
						{/if}
						{#each data.locations as loc}
							<option value={loc.id}>{loc.name}{loc.category ? ` · ${loc.category}` : ''}</option>
						{/each}
					</select>
				</div>
			{/snippet}
			{@render pointSelect('From', pointAId, (v) => (pointAId = v))}
			{@render pointSelect('To', pointBId, (v) => (pointBId = v))}
		</div>
	</div>

	{#if !society.lat || !society.lng}
		<p class="no-coords">No coordinates set — add them in <a href="/society/settings">Settings</a> to enable tile caching.</p>
	{/if}
</div>

<style>
	.page-container {
		max-width: 1100px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.map-card {
		overflow: hidden;
	}

	:global(.map-card .card-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.map-body {
		padding: 1rem;
	}

	.map-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.6rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--surface-dk);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		background: none;
		border: 1px solid var(--border-subtle);
		cursor: pointer;
		transition: opacity 0.15s, border-color 0.15s;
	}

	.legend-item:hover { border-color: var(--border); }

	.legend-item--hidden {
		opacity: 0.45;
	}

	.legend-swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		flex-shrink: 0;
		border: 2px solid;
		transition: background 0.15s;
	}

	.legend-label {
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--ink-mid);
	}

	.coord-capture {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--tint-green);
	}

	.coord-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		flex: 1;
	}

	.coord-field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.coord-field label {
		font-size: var(--text-xs);
		letter-spacing: 0.12em;
	}

	.coord-input-row {
		display: flex;
		gap: 0.5rem;
	}

	.coord-input-row input {
		flex: 1;
		font-family: var(--font-mono) !important;
		font-size: var(--text-sm) !important;
	}

	.coord-actions {
		flex-shrink: 0;
	}

	.warm-result {
		padding: 0.75rem 1.5rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border-top: 1px solid var(--border-subtle);
	}

	.warm-result--success { background: var(--tint-green); color: var(--accent); }
	.warm-result--error   { background: var(--danger-lt); color: var(--danger); }

	.distance-card {
		margin-top: 1.5rem;
	}

	.distance-result {
		font-size: var(--text-lg);
		color: var(--ink);
	}

	.distance-body {
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.point-row {
		display: grid;
		grid-template-columns: 3rem 1fr;
		align-items: center;
		gap: 1rem;
	}

	.point-label {
		font-size: var(--text-xs);
		letter-spacing: 0.2em;
		color: var(--ink-faint);
	}

	.no-coords {
		margin-top: 1rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
