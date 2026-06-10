import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { executeExternalFetch } from '$lib/server/http/external-fetch';

export const CACHE_ROOT = join(process.env.DATA_DIR ?? process.cwd(), 'tile-cache');
const OSM_SUBDOMAINS = ['a', 'b', 'c'];
const TILE_FETCH_TIMEOUT_MS = 2000;
const WARM_TILE_CONCURRENCY = 8;

type TileCoordinate = [number, number, number];

export async function getCachedTile(z: string, x: string, y: string): Promise<Buffer | null> {
	try {
		return await readFile(join(CACHE_ROOT, z, x, `${y}.png`));
	} catch {
		return null;
	}
}

export async function fetchAndCacheTile(z: string, x: string, y: string): Promise<Buffer | null> {
	const subdomain = OSM_SUBDOMAINS[Math.floor(Math.random() * OSM_SUBDOMAINS.length)];
	const url = `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

	const result = await executeExternalFetch({
		url,
		init: {
			headers: { 'User-Agent': 'WorkingSociety/1.0 tile-proxy (self-hosted)' }
		},
		timeoutMs: TILE_FETCH_TIMEOUT_MS,
		retries: 1,
		retryOn: ['timeout', 'network']
	});

	if (!result.ok) {
		return null;
	}

	const res = result.response;

	const buffer = Buffer.from(await res.arrayBuffer());
	await mkdir(join(CACHE_ROOT, z, x), { recursive: true });
	await writeFile(join(CACHE_ROOT, z, x, `${y}.png`), buffer);
	return buffer;
}

function latLngToTile(lat: number, lng: number, z: number): [number, number] {
	const x = Math.floor(((lng + 180) / 360) * 2 ** z);
	const latRad = (lat * Math.PI) / 180;
	const y = Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * 2 ** z
	);
	return [x, y];
}

// Degrees of lat/lng to include at each zoom level.
// Shrinks at higher zooms to keep tile counts reasonable.
const ZOOM_RADIUS_DEG: Record<number, number> = {
	10: 1.0,
	11: 0.8,
	12: 0.5,
	13: 0.3,
	14: 0.15,
	15: 0.08,
	16: 0.04
};

export async function warmLocalTiles(
	lat: number,
	lng: number,
	onProgress?: (done: number, total: number) => void
): Promise<{ fetched: number; alreadyCached: number; failed: number }> {
	const tiles: TileCoordinate[] = [];

	for (const [zoom, radius] of Object.entries(ZOOM_RADIUS_DEG)) {
		const z = Number(zoom);
		const [xMin, yMax] = latLngToTile(lat - radius, lng - radius, z);
		const [xMax, yMin] = latLngToTile(lat + radius, lng + radius, z);
		for (let x = xMin; x <= xMax; x++) {
			for (let y = yMin; y <= yMax; y++) {
				tiles.push([z, x, y]);
			}
		}
	}

	return warmTileBatch({
		tiles,
		concurrency: WARM_TILE_CONCURRENCY,
		onProgress,
		getCachedTileImpl: getCachedTile,
		fetchAndCacheTileImpl: fetchAndCacheTile
	});
}

export async function warmTileBatch(params: {
	tiles: TileCoordinate[];
	concurrency: number;
	onProgress?: (done: number, total: number) => void;
	getCachedTileImpl: (z: string, x: string, y: string) => Promise<Buffer | null>;
	fetchAndCacheTileImpl: (z: string, x: string, y: string) => Promise<Buffer | null>;
}): Promise<{ fetched: number; alreadyCached: number; failed: number }> {
	const concurrency = Math.max(1, Math.floor(params.concurrency));
	const tiles = params.tiles;
	const totals = {
		fetched: 0,
		alreadyCached: 0,
		failed: 0
	};
	let cursor = 0;

	const worker = async () => {
		while (true) {
			const index = cursor;
			cursor += 1;
			if (index >= tiles.length) return;

			const [z, x, y] = tiles[index];
			try {
				const cached = await params.getCachedTileImpl(String(z), String(x), String(y));
				if (cached) {
					totals.alreadyCached += 1;
				} else {
					const fetched = await params.fetchAndCacheTileImpl(String(z), String(x), String(y));
					if (fetched) totals.fetched += 1;
					else totals.failed += 1;
				}
			} catch {
				totals.failed += 1;
			}

			params.onProgress?.(totals.fetched + totals.alreadyCached + totals.failed, tiles.length);
		}
	};

	const workers = Array.from({ length: Math.min(concurrency, Math.max(1, tiles.length)) }, () => worker());
	await Promise.all(workers);

	return totals;
}
