import { error, redirect } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.person) {
		throw redirect(303, '/login');
	}

	const societyId = resolveSocietyId(undefined);
	const repos = getRepositories();
	const society = await repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const limit = 200;
	const events = await repos.auditEvents.listBySociety(societyId, limit);

	return { society, events };
};
