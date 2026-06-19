import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);
	if (!society) throw error(404, 'Society not found');

	const courses = await repos.courses.listCourses(societyId, false);

	return {
		society,
		courses,
		printedAt: new Date().toISOString()
	};
};
