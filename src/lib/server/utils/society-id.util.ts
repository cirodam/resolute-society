import { error } from '@sveltejs/kit';
import { getConfig } from '$lib/server/infra/config';

let _cachedSocietyId: string | null = null;

export async function resolveSocietyIdAsync(routeSocietyId: string | undefined): Promise<string> {
	if (routeSocietyId) return routeSocietyId;
	if (_cachedSocietyId) return _cachedSocietyId;
	const id = await getConfig('society.id', '');
	if (!id) throw error(404, 'Society not found');
	_cachedSocietyId = id;
	return id;
}

/**
 * Synchronous version — only valid after the society has been set up.
 * Requires a prior call to resolveSocietyIdAsync() to populate the cache.
 */
export function resolveSocietyId(routeSocietyId: string | undefined): string {
	if (routeSocietyId) return routeSocietyId;
	if (_cachedSocietyId) return _cachedSocietyId;
	throw error(500, 'Society ID cache not yet populated — call resolveSocietyIdAsync first');
}
