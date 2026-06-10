import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { calculatePopulationRequirements } from '$lib/server/services/nutrition.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);
	if (!society) throw error(404, 'Society not found');

	return {
		society,
		foods: await repos.nutrition.listFoods(societyId),
		nutrients: await repos.nutrition.listNutrients(societyId),
		foodNutrients: await repos.nutrition.listAllFoodNutrients(societyId),
		requirements: await calculatePopulationRequirements(societyId),
		printedAt: new Date().toISOString()
	};
};
