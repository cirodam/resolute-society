import { error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';

let _cachedSocietyId: string | null = null;

export async function resolveSocietyIdAsync(routeSocietyId: string | undefined): Promise<string> {
	if (routeSocietyId) return routeSocietyId;
	if (_cachedSocietyId) return _cachedSocietyId;
	const societies = await getRepositories().societies.listAll();
	const society = societies[0];
	if (!society) throw error(404, 'Society not found');
	_cachedSocietyId = society.id;
	return society.id;
}

/**
 * Synchronous version — only valid after the society has been set up.
 * Requires a prior call to resolveSocietyIdAsync() to populate the cache.
 * Use resolveSocietyIdAsync() in all async contexts (load functions, actions).
 */
export function resolveSocietyId(routeSocietyId: string | undefined): string {
	if (routeSocietyId) return routeSocietyId;
	if (_cachedSocietyId) return _cachedSocietyId;
	throw error(500, 'Society ID cache not yet populated — call resolveSocietyIdAsync first');
}
