<script lang="ts">
	import { enhance } from '$app/forms';
	import SocietyMap from '$lib/components/SocietyMap.svelte';
	import type { PageData, ActionData } from './$types';
	import type { RoadNodeRow, RoadEdgeRow } from '$lib/server/infra/repositories';
	import type { GraphMode } from '$lib/components/SocietyMap.svelte';

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

	// ── Straight-line distance ────────────────────────────────────────────────
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

	// ── Road graph ───────────────────────────────────────────────────────────
	let roadNodes = $state<RoadNodeRow[]>(data.roadNodes);
	let roadEdges = $state<RoadEdgeRow[]>(data.roadEdges);
	let graphMode = $state<GraphMode>('view');
	let graphBusy = $state(false);

	const modeHints: Record<GraphMode, string> = {
		'view':     '',
		'add-node': 'Click anywhere on the map to place a node.',
		'add-edge': 'Click a node, then click another node to connect them.',
		'delete':   'Click a node or road segment to delete it.'
	};

	async function handleAddNode(lat: number, lng: number) {
		if (graphBusy) return;
		graphBusy = true;
		try {
			const res = await fetch('/api/road-graph/nodes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ lat, lng })
			});
			if (res.ok) {
				const node: RoadNodeRow = await res.json();
				roadNodes = [...roadNodes, node];
			}
		} finally {
			graphBusy = false;
		}
	}

	async function handleAddEdge(nodeAId: string, nodeBId: string) {
		if (graphBusy) return;
		graphBusy = true;
		try {
			const res = await fetch('/api/road-graph/edges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ nodeAId, nodeBId })
			});
			if (res.ok) {
				const edge: RoadEdgeRow = await res.json();
				roadEdges = [...roadEdges, edge];
			}
		} finally {
			graphBusy = false;
		}
	}

	async function handleDeleteNode(id: string) {
		if (graphBusy) return;
		graphBusy = true;
		try {
			const res = await fetch(`/api/road-graph/nodes/${id}`, { method: 'DELETE' });
			if (res.ok) {
				roadNodes = roadNodes.filter(n => n.id !== id);
				// Remove edges that referenced this node
				roadEdges = roadEdges.filter(e => e.node_a_id !== id && e.node_b_id !== id);
			}
		} finally {
			graphBusy = false;
		}
	}

	async function handleDeleteEdge(id: string) {
		if (graphBusy) return;
		graphBusy = true;
		try {
			const res = await fetch(`/api/road-graph/edges/${id}`, { method: 'DELETE' });
			if (res.ok) {
				roadEdges = roadEdges.filter(e => e.id !== id);
			}
		} finally {
			graphBusy = false;
		}
	}

	// ── Routing (Dijkstra's) ─────────────────────────────────────────────────
	let routeFromId = $state('');
	let routeToId = $state('');
	let routeResult = $state<{ path: string[]; distanceKm: number } | null>(null);
	let routeNoPath = $state(false);

	const highlightPath = $derived(routeResult?.path ?? null);

	function findRoute() {
		routeResult = null;
		routeNoPath = false;

		if (!routeFromId || !routeToId || routeFromId === routeToId) return;

		const dist = new Map<string, number>();
		const prev = new Map<string, string | null>();
		const unvisited = new Set<string>();

		for (const node of roadNodes) {
			dist.set(node.id, Infinity);
			prev.set(node.id, null);
			unvisited.add(node.id);
		}
		dist.set(routeFromId, 0);

		const adj = new Map<string, Array<{ id: string; dist: number }>>();
		for (const node of roadNodes) adj.set(node.id, []);
		for (const edge of roadEdges) {
			adj.get(edge.node_a_id)?.push({ id: edge.node_b_id, dist: edge.distance_km });
			adj.get(edge.node_b_id)?.push({ id: edge.node_a_id, dist: edge.distance_km });
		}

		while (unvisited.size > 0) {
			let u = '';
			let minDist = Infinity;
			for (const id of unvisited) {
				const d = dist.get(id) ?? Infinity;
				if (d < minDist) { minDist = d; u = id; }
			}
			if (!u || minDist === Infinity) break;
			if (u === routeToId) break;
			unvisited.delete(u);
			for (const neighbor of (adj.get(u) ?? [])) {
				if (!unvisited.has(neighbor.id)) continue;
				const alt = (dist.get(u) ?? Infinity) + neighbor.dist;
				if (alt < (dist.get(neighbor.id) ?? Infinity)) {
					dist.set(neighbor.id, alt);
					prev.set(neighbor.id, u);
				}
			}
		}

		const totalDist = dist.get(routeToId) ?? Infinity;
		if (totalDist === Infinity) { routeNoPath = true; return; }

		const path: string[] = [];
		let current: string | null = routeToId;
		while (current !== null) {
			path.unshift(current);
			current = prev.get(current) ?? null;
		}

		routeResult = { path, distanceKm: totalDist };
	}

	function clearRoute() {
		routeResult = null;
		routeNoPath = false;
		routeFromId = '';
		routeToId = '';
	}

	const routeDistKm = $derived(routeResult ? routeResult.distanceKm : null);
	const routeDistMi = $derived(routeDistKm !== null ? routeDistKm * 0.621371 : null);
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
					return async ({ update }) => { await update(); warming = false; };
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
			<SocietyMap
				societies={[society]}
				hubAssociations={data.hubAssociations}
				locations={data.locations}
				viewType="local"
				onMapClick={graphMode === 'view' ? handleMapClick : undefined}
				{measureLine}
				{hiddenCategories}
				{roadNodes}
				{roadEdges}
				{graphMode}
				highlightPath={highlightPath}
				onAddNode={handleAddNode}
				onAddEdge={handleAddEdge}
				onDeleteNode={handleDeleteNode}
				onDeleteEdge={handleDeleteEdge}
			/>
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
					<span class="t-label">Latitude</span>
					<div class="coord-input-row">
						<input type="text" readonly value={clickedLat !== null ? clickedLat.toFixed(6) : ''} placeholder="click map to capture" />
						<button class="btn" disabled={clickedLat === null} onclick={() => copyToClipboard(clickedLat!.toFixed(6), 'lat')}>
							{copied === 'lat' ? 'Copied' : 'Copy'}
						</button>
					</div>
				</div>
				<div class="coord-field">
					<span class="t-label">Longitude</span>
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

	<!-- Straight-line distance -->
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

	<!-- Road graph editor -->
	<div class="graph-card card-border">
		<div class="card-header">
			<h2>Road Graph</h2>
			<span class="graph-stats t-label">
				{roadNodes.length} node{roadNodes.length === 1 ? '' : 's'} · {roadEdges.length} segment{roadEdges.length === 1 ? '' : 's'}
			</span>
		</div>

		<div class="graph-modes">
			{#each (['view', 'add-node', 'add-edge', 'delete'] as GraphMode[]) as mode}
				<button
					class="mode-btn"
					class:mode-btn--active={graphMode === mode}
					onclick={() => { graphMode = mode; clearRoute(); }}
				>
					{mode === 'view' ? 'View' : mode === 'add-node' ? 'Add Node' : mode === 'add-edge' ? 'Add Edge' : 'Delete'}
				</button>
			{/each}
			{#if graphBusy}
				<span class="busy-indicator t-label">saving…</span>
			{/if}
		</div>

		{#if modeHints[graphMode]}
			<div class="mode-hint">{modeHints[graphMode]}</div>
		{/if}

		<!-- Route finder -->
		{#if roadNodes.length >= 2 && graphMode === 'view'}
			<div class="route-finder">
				<div class="route-header t-label">Find Route</div>
				<div class="route-selects">
					<div class="point-row">
						<span class="point-label t-label">From</span>
						<select bind:value={routeFromId} onchange={() => { routeResult = null; routeNoPath = false; }}>
							<option value="">— select node —</option>
							{#each roadNodes as node}
								<option value={node.id}>{node.label ?? `Node (${node.lat.toFixed(4)}, ${node.lng.toFixed(4)})`}</option>
							{/each}
						</select>
					</div>
					<div class="point-row">
						<span class="point-label t-label">To</span>
						<select bind:value={routeToId} onchange={() => { routeResult = null; routeNoPath = false; }}>
							<option value="">— select node —</option>
							{#each roadNodes as node}
								<option value={node.id}>{node.label ?? `Node (${node.lat.toFixed(4)}, ${node.lng.toFixed(4)})`}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="route-actions">
					<button class="btn" disabled={!routeFromId || !routeToId || routeFromId === routeToId} onclick={findRoute}>
						Find Route
					</button>
					{#if routeResult || routeNoPath}
						<button class="btn btn--ghost" onclick={clearRoute}>Clear</button>
					{/if}
				</div>
				{#if routeResult}
					<div class="route-result">
						{routeResult.path.length - 1} segment{routeResult.path.length - 1 === 1 ? '' : 's'} ·
						<span class="t-numeric">{routeDistKm!.toFixed(2)} km · {routeDistMi!.toFixed(2)} mi</span>
					</div>
				{:else if routeNoPath}
					<div class="route-no-path">No connected path between those nodes.</div>
				{/if}
			</div>
		{/if}
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

	.page-header { margin-bottom: var(--space-6); }

	.map-card { overflow: hidden; }

	:global(.map-card .card-header),
	:global(.distance-card .card-header),
	:global(.graph-card .card-header) {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.map-body { padding: 1rem; }

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
	.legend-item--hidden { opacity: 0.45; }

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

	.coord-field .t-label { font-size: var(--text-xs); letter-spacing: 0.12em; }

	.coord-input-row { display: flex; gap: 0.5rem; }
	.coord-input-row input {
		flex: 1;
		font-family: var(--font-mono) !important;
		font-size: var(--text-sm) !important;
	}

	.coord-actions { flex-shrink: 0; }

	.warm-result {
		padding: 0.75rem 1.5rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border-top: 1px solid var(--border-subtle);
	}

	.warm-result--success { background: var(--tint-green); color: var(--accent); }
	.warm-result--error   { background: var(--danger-lt); color: var(--danger); }

	.distance-card,
	.graph-card {
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

	/* Graph card */
	.graph-stats {
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--ink-mid);
	}

	.graph-modes {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.75rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		background: var(--surface-dk);
	}

	.mode-btn {
		padding: 0.3rem 0.9rem;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink-mid);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.mode-btn:hover { border-color: var(--gold); color: var(--ink); }

	.mode-btn--active {
		background: var(--gold);
		color: var(--surface);
		border-color: var(--gold);
	}

	.busy-indicator {
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--ink-faint);
		margin-left: 0.5rem;
		font-style: italic;
	}

	.mode-hint {
		padding: 0.5rem 1.5rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
		border-top: 1px solid var(--border-faint);
	}

	.route-finder {
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.route-header {
		font-size: var(--text-xs);
		letter-spacing: 0.15em;
		color: var(--ink-mid);
	}

	.route-selects {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.route-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.route-result {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
	}

	.route-no-path {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
	}

	.no-coords {
		margin-top: 1rem;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
	}
</style>
