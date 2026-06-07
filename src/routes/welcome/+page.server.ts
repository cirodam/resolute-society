import { getRepositories } from '$lib/server/infra/repositories';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) {
		throw error(401, 'Not authenticated');
	}

	const repositories = getRepositories();
	const society = await repositories.societies.findDetailById(locals.person.society_id);

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		person: locals.person,
		society
	};
};

export const actions: Actions = {
	default: async ({ locals }) => {
		if (!locals.person) {
			throw error(401, 'Not authenticated');
		}

		await getRepositories().people.markWelcomeSeen(locals.person.id);
		throw redirect(303, '/society');
	}
};
