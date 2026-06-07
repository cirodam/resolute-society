import { db } from '$lib/server/infra/db';
import { error, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.person) {
		throw redirect(303, '/login');
	}

	if (!params.id) {
		throw error(400, 'Person ID required');
	}

	const personData = getRepositories().people.findSocietyByPersonId(params.id);

	if (!personData) {
		throw error(404, 'Person not found');
	}

	return {
		person: locals.person,
		societyId: personData.society_id
	};
};
