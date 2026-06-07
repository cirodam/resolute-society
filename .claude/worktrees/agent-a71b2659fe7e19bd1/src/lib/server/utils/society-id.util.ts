import { error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';

export function resolveSocietyId(routeSocietyId: string | undefined): string {
	if (routeSocietyId) {
		return routeSocietyId;
	}

	const society = getRepositories().societies.listAll()[0];
	if (!society) {
		throw error(404, 'Society not found');
	}

	return society.id;
}
