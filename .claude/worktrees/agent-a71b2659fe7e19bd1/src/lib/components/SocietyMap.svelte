<script lang="ts">
	import { onMount } from 'svelte';

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

	let { societies, hubAssociations = [], locations = [], viewType = 'regional', onMapClick, measureLine = null, hiddenCategories = [] }: {
		societies: Society[];
		hubAssociations?: HubAssociation[];
		locations?: Location[];
		viewType?: 'regional' | 'local';
		onMapClick?: (lat: number, lng: number) => void;
		measureLine?: MeasureLine | null;
		hiddenCategories?: string[];
	} = $props();

	let mapContainer: HTMLElement;
	let map: any;
	let leaflet: any;
	let lineLayer: any = null;
	const categoryLayers = new Map<string, any>(); // category id -> L.LayerGroup

	$effect(() => {
		const hidden = hiddenCategories; // read for tracking
		if (!map || !leaflet) return;
		for (const [catId, layer] of categoryLayers) {
			if (hidden.includes(catId)) {
				map.removeLayer(layer);
			} else {
				layer.addTo(map);
			}
		}
	});

	$effect(() => {
		const line = measureLine; // read before early return so Svelte tracks it as a dependency
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

	onMount(() => {
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		void (async () => {
			// Dynamically import Leaflet to avoid SSR issues
			const L = (await import('leaflet')).default;
			leaflet = L;

			// Filter locations with valid coordinates
			const mappableSocieties = societies.filter((s) => s.lat != null && s.lng != null);
			const mappableHubs = hubAssociations.filter((h) => h.location_lat != null && h.location_lng != null);
			const allMappable = [
				...mappableSocieties.map(s => ({ lat: s.lat!, lng: s.lng! })),
				...mappableHubs.map(h => ({ lat: h.location_lat!, lng: h.location_lng! }))
			];

			// Determine initial map center and zoom based on view type
			let initialCenter: [number, number] = [39.8, -98.5]; // Default US center
			let initialZoom = 4; // Default US zoom

			if (viewType === 'local' && allMappable.length > 0) {
				// Local view: start centered and zoomed on the first location
				const first = allMappable[0];
				initialCenter = [first.lat!, first.lng!];
				initialZoom = 13;
			} else if (viewType === 'regional' && allMappable.length > 0) {
				// Regional view: start centered on first location with regional zoom
				const first = allMappable[0];
				initialCenter = [first.lat!, first.lng!];
				initialZoom = allMappable.length === 1 ? 6 : 8; // Zoom out a bit for multiple items
			}

			// Initialize map with correct initial view
			map = L.map(mapContainer).setView(initialCenter, initialZoom);

			if (onMapClick) {
				map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
					onMapClick(e.latlng.lat, e.latlng.lng);
				});
			}

			// Add tiles via local proxy (cached to disk indefinitely)
			L.tileLayer('/api/tiles/{z}/{x}/{y}', {
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				maxZoom: 19
			}).addTo(map);

			// Add markers for each society
			mappableSocieties.forEach((society) => {
			const markerClass = 'marker-good';

			// Create custom icon using DivIcon
			const icon = L.divIcon({
				className: 'custom-marker',
				html: `<div class="marker-pin ${markerClass}"></div>`,
				iconSize: [24, 24],
				iconAnchor: [12, 12]
			});

			// Create marker
			const marker = L.marker([society.lat!, society.lng!], { icon }).addTo(map);

			// Create popup content
			const popupContent = `
				<div class="marker-popup">
					<h3 class="popup-name">${society.name}</h3>
					<p class="popup-handle">${society.handle}</p>
					<a href="/society" class="popup-link">View Society →</a>
				</div>
			`;

			marker.bindPopup(popupContent);
		});

			mappableHubs.forEach((hub) => {
				const icon = L.divIcon({
					className: 'custom-marker',
					html: `<div class="marker-pin marker-hub"></div>`,
					iconSize: [24, 24],
					iconAnchor: [12, 12]
				});

				const marker = L.marker([hub.location_lat!, hub.location_lng!], { icon }).addTo(map);
				const popupContent = `
					<div class="marker-popup">
						<h3 class="popup-name">${hub.name}</h3>
						${hub.location_address ? `<p class="popup-handle">${hub.location_address}</p>` : ''}
						<a href="/association/${hub.id}" class="popup-link">View →</a>
					</div>
				`;
				marker.bindPopup(popupContent);
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
				const popupContent = `
					<div class="marker-popup">
						<h3 class="popup-name">${loc.name}</h3>
						${loc.category ? `<p class="popup-meta">${loc.category.name}</p>` : ''}
						${loc.address ? `<p class="popup-handle">${loc.address}</p>` : ''}
						${loc.notes ? `<p class="popup-handle">${loc.notes}</p>` : ''}
					</div>
				`;
				marker.bindPopup(popupContent);

				if (loc.category) {
					if (!categoryLayers.has(loc.category.id)) {
						categoryLayers.set(loc.category.id, L.layerGroup().addTo(map));
					}
					marker.addTo(categoryLayers.get(loc.category.id));
				} else {
					marker.addTo(map);
				}
			});

			// Adjust view for multiple markers (fitBounds needed)
			if (allMappable.length > 1) {
				const bounds = L.latLngBounds(allMappable.map((item) => [item.lat, item.lng]));
				// Use setTimeout to ensure map is fully initialized
				timeoutId = setTimeout(() => {
					if (viewType === 'local') {
						map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
					} else {
						map.fitBounds(bounds, { padding: [100, 100], maxZoom: 11 });
					}
				}, 100);
			}
			// Single marker or no markers: initial view is already correct
		})();

		return () => {
			// Cleanup on destroy
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			if (map) {
				map.remove();
			}
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

	/* Custom marker styles */
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

	:global(.marker-pin:hover) {
		transform: scale(1.2);
	}

	:global(.marker-good) {
		background-color: var(--accent, #2d5a4f);
	}

	:global(.marker-hub) {
		background-color: #4a90e2;
	}

	:global(.marker-location) {
		background-color: var(--gold, #7a5c1a);
	}

	/* Popup styles */
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

	/* Override Leaflet popup styles to match theme */
	:global(.leaflet-popup-content-wrapper) {
		border-radius: var(--radius-md, 8px);
		box-shadow: var(--shadow-elevated);
		border: 1px solid var(--border, rgba(45, 90, 79, 0.2));
	}

	:global(.leaflet-popup-tip) {
		border-top-color: var(--border, rgba(45, 90, 79, 0.2));
	}
</style>
