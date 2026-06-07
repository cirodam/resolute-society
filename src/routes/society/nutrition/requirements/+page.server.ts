import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { calculatePopulationRequirements, getPopulationDemographics } from '$lib/server/services/nutrition.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society,
		requirements: calculatePopulationRequirements(societyId),
		demographics: getPopulationDemographics(societyId)
	};
};
