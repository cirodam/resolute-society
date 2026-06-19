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

	const PAGE_SIZE = 50;
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [events, total] = await Promise.all([
		repos.auditEvents.listBySociety(societyId, PAGE_SIZE, offset),
		repos.auditEvents.countBySociety(societyId)
	]);

	return { society, events, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
};
