import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);
	if (!society) throw error(404, 'Society not found');

	const allEvents = await repos.events.listBySociety(societyId);
	const now = new Date().toISOString();
	const events = allEvents.filter((e) => e.starts_at >= now);

	return {
		society,
		events,
		printedAt: new Date().toISOString()
	};
};
