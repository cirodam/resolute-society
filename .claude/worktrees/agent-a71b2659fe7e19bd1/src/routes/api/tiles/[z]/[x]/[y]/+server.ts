import { getCachedTile, fetchAndCacheTile } from '$lib/server/tile-cache';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { z, x, y } = params;

	if (!/^\d{1,2}$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
		return new Response('Bad request', { status: 400 });
	}

	const cached = await getCachedTile(z, x, y);
	if (cached) return png(cached);

	const fetched = await fetchAndCacheTile(z, x, y);
	if (fetched) return png(fetched);

	return new Response('Tile unavailable', { status: 502 });
};

function png(body: Buffer): Response {
	return new Response(body, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
}
