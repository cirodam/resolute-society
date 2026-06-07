import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);

	const food = await repos.nutrition.findFood(params.id);
	if (!food) throw error(404, 'Food not found');

	return {
		food,
		nutrients: await repos.nutrition.listNutrients(societyId),
		foodNutrients: await repos.nutrition.listFoodNutrients(params.id)
	};
};

export const actions = {
	saveNutrients: async (event) => {
		const data = await event.request.formData();
		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const nutrients = await repos.nutrition.listNutrients(societyId);

		for (const nutrient of nutrients) {
			const raw = data.get(`n_${nutrient.id}`)?.toString();
			const value = raw !== undefined ? parseFloat(raw) : NaN;
			if (!isNaN(value) && value >= 0) {
				await repos.nutrition.setFoodNutrient(event.params.id, nutrient.id, value);
			}
		}

		return { saveSuccess: true };
	}
} satisfies Actions;
