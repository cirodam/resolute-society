import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { calculatePopulationRequirements } from '$lib/server/services/nutrition.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society,
		foods: repos.nutrition.listFoods(societyId),
		foodNutrients: repos.nutrition.listAllFoodNutrients(societyId),
		requirements: calculatePopulationRequirements(societyId)
	};
};

export const actions = {
	addFood: async (event) => {
		const data = await event.request.formData();
		const name = data.get('name')?.toString().trim();

		if (!name) return fail(400, { addFoodError: 'Name is required' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);

		repos.nutrition.createFood(societyId, name);

		return { addFoodSuccess: true };
	},

	deleteFood: async (event) => {
		const data = await event.request.formData();
		const foodId = data.get('food_id')?.toString();

		if (!foodId) return fail(400, { deleteFoodError: 'Food ID required' });

		getRepositories().nutrition.deleteFood(foodId);

		return { deleteFoodSuccess: true };
	}
} satisfies Actions;
