import { error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.person) {
		throw error(401, 'Not authenticated');
	}

	const associationId = params.id;
	if (!associationId) {
		throw error(400, 'Association ID required');
	}

	const associationData = await getRepositories().associations.findById(associationId);

	if (!associationData) {
		throw error(404, 'Association not found');
	}

	return {
		person: locals.person,
		societyId: associationData.society_id
	};
};
