import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const CACHE_ROOT = join(process.cwd(), 'tile-cache');
const OSM_SUBDOMAINS = ['a', 'b', 'c'];

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

	let res: Response;
	try {
		res = await fetch(url, {
			headers: { 'User-Agent': 'WorkingSociety/1.0 tile-proxy (self-hosted)' }
		});
	} catch {
		return null;
	}

	if (!res.ok) return null;

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
	const tiles: Array<[number, number, number]> = [];

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

	let fetched = 0;
	let alreadyCached = 0;
	let failed = 0;

	for (const [z, x, y] of tiles) {
		const cached = await getCachedTile(String(z), String(x), String(y));
		if (cached) {
			alreadyCached++;
		} else {
			const result = await fetchAndCacheTile(String(z), String(x), String(y));
			if (result) fetched++;
			else failed++;
		}
		onProgress?.(fetched + alreadyCached + failed, tiles.length);
	}

	return { fetched, alreadyCached, failed };
}
