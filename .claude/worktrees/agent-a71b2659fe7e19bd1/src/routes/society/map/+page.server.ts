import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { warmLocalTiles } from '$lib/server/tile-cache';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = repos.societies.findDetailById(societyId);

	if (!society) throw error(404, 'Society not found');

	return {
		society,
		hubAssociations: repos.associations.listHubsBySociety(societyId),
		locations: repos.locations.listBySociety(societyId),
		categories: repos.locationCategories.listBySociety(societyId)
	};
};

export const actions: Actions = {
	warmCache: async () => {
		const repos = getRepositories();
		const society = repos.societies.findDetailById(resolveSocietyId(undefined));

		if (!society) return fail(404, { warmError: 'Society not found' });

		if (!society.lat || !society.lng) {
			return fail(400, { warmError: 'Society has no coordinates set. Add them in Settings first.' });
		}

		const result = await warmLocalTiles(society.lat, society.lng);

		return {
			warmSuccess: true,
			fetched: result.fetched,
			alreadyCached: result.alreadyCached,
			failed: result.failed
		};
	}
};
