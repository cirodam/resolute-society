import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { calculatePopulationRequirements } from '$lib/server/services/nutrition.service';
import { audit } from '$lib/server/services/audit.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society,
		foods: await repos.nutrition.listFoods(societyId),
		foodNutrients: await repos.nutrition.listAllFoodNutrients(societyId),
		requirements: await calculatePopulationRequirements(societyId)
	};
};

export const actions = {
	addFood: async (event) => {
		const data = await event.request.formData();
		const name = data.get('name')?.toString().trim();

		if (!name) return fail(400, { addFoodError: 'Name is required' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const foodId = await repos.nutrition.createFood(societyId, name);

		await audit({
			actor: event.locals.person,
			societyId,
			eventType: 'NUTRITION_FOOD_ADDED',
			targetType: 'food',
			targetId: foodId,
			summary: `Food item "${name}" added to community planner`,
			metadata: { name }
		});

		return { addFoodSuccess: true };
	},

	deleteFood: async (event) => {
		const data = await event.request.formData();
		const foodId = data.get('food_id')?.toString();

		if (!foodId) return fail(400, { deleteFoodError: 'Food ID required' });

		await getRepositories().nutrition.deleteFood(foodId);

		await audit({
			actor: event.locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'NUTRITION_FOOD_DELETED',
			targetType: 'food',
			targetId: foodId,
			summary: `Food item removed from community planner`,
			metadata: { foodId }
		});

		return { deleteFoodSuccess: true };
	}
} satisfies Actions;
