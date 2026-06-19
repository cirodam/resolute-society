<script lang="ts">
	import { onMount } from 'svelte';
	import type { RoadNodeRow, RoadEdgeRow } from '$lib/server/infra/repositories';

	interface Society {
		id: string;
		handle: string;
		name: string;
		address: string | null;
		lat: number | null;
		lng: number | null;
	}

	interface HubAssociation {
		id: string;
		name: string;
		location_address: string | null;
		location_lat: number | null;
		location_lng: number | null;
	}

	interface Location {
		id: string;
		name: string;
		category: { id: string; name: string; color: string } | null;
		address: string | null;
		lat: number;
		lng: number;
		notes: string | null;
	}

	interface MeasureLine {
		a: [number, number];
		b: [number, number];
	}

	export type GraphMode = 'view' | 'add-node' | 'add-edge' | 'delete';

	let {
		societies,
		hubAssociations = [],
		locations = [],
		viewType = 'regional',
		onMapClick,
		measureLine = null,
		hiddenCategories = [],
		roadNodes = [],
		roadEdges = [],
		graphMode = 'view',
		highlightPath = null,
		onAddNode,
		onAddEdge,
		onDeleteNode,
		onDeleteEdge
	}: {
		societies: Society[];
		hubAssociations?: HubAssociation[];
		locations?: Location[];
		viewType?: 'regional' | 'local';
		onMapClick?: (lat: number, lng: number) => void;
		measureLine?: MeasureLine | null;
		hiddenCategories?: string[];
		roadNodes?: RoadNodeRow[];
		roadEdges?: RoadEdgeRow[];
		graphMode?: GraphMode;
		highlightPath?: string[] | null;
		onAddNode?: (lat: number, lng: number) => void;
		onAddEdge?: (nodeAId: string, nodeBId: string) => void;
		onDeleteNode?: (id: string) => void;
		onDeleteEdge?: (id: string) => void;
	} = $props();

	let mapContainer: HTMLElement;
	let map: any;
	let leaflet: any;
	let lineLayer: any = null;
	const categoryLayers = new Map<string, any>();

	// Graph layers
	let nodeLayer: any = null;
	let edgeLayer: any = null;
	let pathLayer: any = null;

	// Mutable refs read inside Leaflet event handlers
	let currentMode: GraphMode = 'view';
	let pendingEdgeNodeId: string | null = null;
	let pendingMarker: any = null;

	$effect(() => { currentMode = graphMode; });

	$effect(() => {
		const hidden = hiddenCategories;
		if (!map || !leaflet) return;
		for (const [catId, layer] of categoryLayers) {
			if (hidden.includes(catId)) map.removeLayer(layer);
			else layer.addTo(map);
		}
	});

	$effect(() => {
		const line = measureLine;
		if (!map || !leaflet) return;
		if (lineLayer) { lineLayer.remove(); lineLayer = null; }
		if (line) {
			lineLayer = leaflet.polyline([line.a, line.b], {
				color: '#7a5c1a',
				weight: 2,
				dashArray: '8, 5',
				opacity: 0.85
			}).addTo(map);
		}
	});

	$effect(() => {
		const nodes = roadNodes;
		const edges = roadEdges;
		const path = highlightPath;
		const mode = graphMode;

		if (!map || !leaflet) return;

		// Clear previous graph layers
		if (edgeLayer) { edgeLayer.remove(); edgeLayer = null; }
		if (nodeLayer) { nodeLayer.remove(); nodeLayer = null; }
		if (pathLayer) { pathLayer.remove(); pathLayer = null; }
		if (pendingMarker) { pendingMarker.remove(); pendingMarker = null; }
		pendingEdgeNodeId = null;

		const nodeMap = new Map<string, RoadNodeRow>(nodes.map(n => [n.id, n]));

		edgeLayer = leaflet.layerGroup().addTo(map);
		nodeLayer = leaflet.layerGroup().addTo(map);

		// Draw edges
		for (const edge of edges) {
			const a = nodeMap.get(edge.node_a_id);
			const b = nodeMap.get(edge.node_b_id);
			if (!a || !b) continue;

			const line = leaflet.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
				color: '#5a7a6a',
				weight: 3,
				opacity: 0.75
			});

			line.on('click', (e: any) => {
				e.originalEvent.stopPropagation();
				if (currentMode === 'delete' && onDeleteEdge) onDeleteEdge(edge.id);
			});

			line.addTo(edgeLayer);
		}

		// Draw nodes
		for (const node of nodes) {
			const icon = leaflet.divIcon({
				className: 'road-node-marker',
				html: `<div class="road-node-pin"></div>`,
				iconSize: [14, 14],
				iconAnchor: [7, 7]
			});

			const marker = leaflet.marker([node.lat, node.lng], { icon });

			if (node.label) marker.bindTooltip(node.label, { permanent: false });

			marker.on('click', (e: any) => {
				e.originalEvent.stopPropagation();
				if (currentMode === 'delete') {
					if (onDeleteNode) onDeleteNode(node.id);
					return;
				}
				if (currentMode === 'add-edge') {
					if (!pendingEdgeNodeId) {
						pendingEdgeNodeId = node.id;
						// Visual indicator for selected node
						pendingMarker = leaflet.circleMarker([node.lat, node.lng], {
							radius: 10,
							color: '#d4a24a',
							weight: 2,
							fill: false
						}).addTo(map);
					} else if (pendingEdgeNodeId !== node.id) {
						if (onAddEdge) onAddEdge(pendingEdgeNodeId, node.id);
						pendingEdgeNodeId = null;
						if (pendingMarker) { pendingMarker.remove(); pendingMarker = null; }
					}
				}
			});

			marker.addTo(nodeLayer);
		}

		// Draw route highlight path
		if (path && path.length >= 2) {
			const coords = path.map(id => nodeMap.get(id)).filter(Boolean).map(n => [n!.lat, n!.lng]);
			pathLayer = leaflet.polyline(coords, {
				color: '#d4a24a',
				weight: 4,
				opacity: 0.9
			}).addTo(map);
		}
	});

	onMount(() => {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		void (async () => {
			const L = (await import('leaflet')).default;
			leaflet = L;

			const mappableSocieties = societies.filter((s) => s.lat != null && s.lng != null);
			const mappableHubs = hubAssociations.filter((h) => h.location_lat != null && h.location_lng != null);
			const allMappable = [
				...mappableSocieties.map(s => ({ lat: s.lat!, lng: s.lng! })),
				...mappableHubs.map(h => ({ lat: h.location_lat!, lng: h.location_lng! }))
			];

			let initialCenter: [number, number] = [39.8, -98.5];
			let initialZoom = 4;

			if (viewType === 'local' && allMappable.length > 0) {
				const first = allMappable[0];
				initialCenter = [first.lat!, first.lng!];
				initialZoom = 13;
			} else if (viewType === 'regional' && allMappable.length > 0) {
				const first = allMappable[0];
				initialCenter = [first.lat!, first.lng!];
				initialZoom = allMappable.length === 1 ? 6 : 8;
			}

			map = L.map(mapContainer).setView(initialCenter, initialZoom);

			map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
				if (currentMode === 'add-node' && onAddNode) {
					onAddNode(e.latlng.lat, e.latlng.lng);
				} else if (currentMode === 'add-edge') {
					// clicks on empty map cancel pending edge selection
					pendingEdgeNodeId = null;
					if (pendingMarker) { pendingMarker.remove(); pendingMarker = null; }
				} else if (onMapClick) {
					onMapClick(e.latlng.lat, e.latlng.lng);
				}
			});

			L.tileLayer('/api/tiles/{z}/{x}/{y}', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(map);

			mappableSocieties.forEach((society) => {
				const icon = L.divIcon({
					className: 'custom-marker',
					html: `<div class="marker-pin marker-good"></div>`,
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});
				const marker = L.marker([society.lat!, society.lng!], { icon }).addTo(map);
				marker.bindPopup(`
					<div class="marker-popup">
						<h3 class="popup-name">${society.name}</h3>
						<p class="popup-handle">${society.handle}</p>
						<a href="/dashboard" class="popup-link">View Society →</a>
					</div>
				`);
			});

			mappableHubs.forEach((hub) => {
				const icon = L.divIcon({
					className: 'custom-marker',
					html: `<div class="marker-pin marker-hub"></div>`,
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});
				const marker = L.marker([hub.location_lat!, hub.location_lng!], { icon }).addTo(map);
				marker.bindPopup(`
					<div class="marker-popup">
						<h3 class="popup-name">${hub.name}</h3>
						${hub.location_address ? `<p class="popup-handle">${hub.location_address}</p>` : ''}
						<a href="/association/${hub.id}" class="popup-link">View →</a>
					</div>
				`);
			});

			locations.forEach((loc) => {
				const color = loc.category?.color ?? '#7a5c1a';
				const icon = L.divIcon({
					className: 'custom-marker',
					html: `<div class="marker-pin" style="background-color:${color}"></div>`,
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});
				const marker = L.marker([loc.lat, loc.lng], { icon });
				marker.bindPopup(`
					<div class="marker-popup">
						<h3 class="popup-name">${loc.name}</h3>
						${loc.category ? `<p class="popup-meta">${loc.category.name}</p>` : ''}
						${loc.address ? `<p class="popup-handle">${loc.address}</p>` : ''}
						${loc.notes ? `<p class="popup-handle">${loc.notes}</p>` : ''}
					</div>
				`);
				if (loc.category) {
					if (!categoryLayers.has(loc.category.id)) {
						categoryLayers.set(loc.category.id, L.layerGroup().addTo(map));
					}
					marker.addTo(categoryLayers.get(loc.category.id));
				} else {
					marker.addTo(map);
				}
			});

			if (allMappable.length > 1) {
				const bounds = L.latLngBounds(allMappable.map((item) => [item.lat, item.lng]));
				timeoutId = setTimeout(() => {
					if (viewType === 'local') {
						map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
					} else {
						map.fitBounds(bounds, { padding: [100, 100], maxZoom: 11 });
					}
				}, 100);
			}
		})();

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			if (map) map.remove();
		};
	});
</script>

<div class="map-wrapper">
	<div bind:this={mapContainer} class="map-container"></div>
</div>

<style>
	.map-wrapper {
		width: 100%;
		height: 500px;
		position: relative;
	}

	.map-container {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-md, 8px);
		overflow: hidden;
	}

	:global(.custom-marker) {
		background: transparent;
		border: none;
	}

	:global(.marker-pin) {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 2px solid white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		transition: transform 0.15s ease;
	}

	:global(.marker-pin:hover) { transform: scale(1.2); }
	:global(.marker-good)     { background-color: var(--accent, #2d5a4f); }
	:global(.marker-hub)      { background-color: #4a90e2; }

	:global(.road-node-marker) {
		background: transparent;
		border: none;
	}

	:global(.road-node-pin) {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #5a7a6a;
		border: 2px solid white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	:global(.road-node-pin:hover) { transform: scale(1.3); }

	:global(.marker-popup) {
		font-family: var(--font-prose);
		padding: var(--space-2, 0.5rem);
		min-width: 180px;
	}

	:global(.popup-name) {
		font-size: var(--text-base, 1rem);
		font-weight: 600;
		margin: 0 0 var(--space-2, 0.5rem) 0;
		color: var(--ink, #151c1a);
	}

	:global(.popup-handle) {
		font-size: var(--text-sm, 0.875rem);
		color: var(--ink-mid, #374340);
		margin: 0 0 var(--space-2, 0.5rem) 0;
	}

	:global(.popup-meta) {
		font-size: var(--text-xs, 0.8125rem);
		color: var(--ink-mid, #374340);
		display: block;
		margin-bottom: var(--space-2, 0.5rem);
	}

	:global(.popup-link) {
		display: inline-block;
		margin-top: var(--space-2, 0.5rem);
		font-size: var(--text-sm, 0.875rem);
		color: var(--gold, #7a5c1a);
		text-decoration: none;
		font-weight: 600;
	}

	:global(.popup-link:hover) {
		color: var(--gold-hover, #d4a24a);
		text-decoration: underline;
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: var(--radius-md, 8px);
		box-shadow: var(--shadow-elevated);
		border: 1px solid var(--border, rgba(45, 90, 79, 0.2));
	}

	:global(.leaflet-popup-tip) {
		border-top-color: var(--border, rgba(45, 90, 79, 0.2));
	}
</style>
