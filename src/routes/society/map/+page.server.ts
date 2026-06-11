import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { setConfig } from '$lib/server/infra/config';
import { warmLocalTiles } from '$lib/server/tile-cache';
import { withCriticalAction } from '$lib/server/http/critical-action';
import { audit } from '$lib/server/services/audit.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findDetailById(societyId);

	if (!society) throw error(404, 'Society not found');

	return {
		society,
		hubAssociations: await repos.associations.listHubsBySociety(societyId),
		locations: await repos.locations.listBySociety(societyId),
		categories: await repos.locationCategories.listBySociety(societyId),
		roadNodes: await repos.roadGraph.listNodesBySociety(societyId),
		roadEdges: await repos.roadGraph.listEdgesBySociety(societyId)
	};
};

export const actions: Actions = {
	centerSociety: async ({ request, locals }) => {
		const data = await request.formData();
		const lat = parseFloat(data.get('lat')?.toString() || '');
		const lng = parseFloat(data.get('lng')?.toString() || '');

		if (isNaN(lat) || isNaN(lng)) return fail(400, { centerError: 'Invalid coordinates' });

		const societyId = resolveSocietyId(undefined);
		await setConfig('society.lat', String(lat));
		await setConfig('society.lng', String(lng));
		await audit({ actor: locals.person, societyId, eventType: 'SOCIETY_UPDATED', targetType: 'society', targetId: societyId, summary: `Society coordinates set to ${lat.toFixed(6)}, ${lng.toFixed(6)}` });

		return { centered: true };
	},

	warmCache: withCriticalAction(async () => {
		const repos = getRepositories();
		const society = await repos.societies.findDetailById(resolveSocietyId(undefined));

		if (!society) return fail(404, { warmError: 'Society not found' });

		if (!society.lat || !society.lng) {
			return fail(400, { warmError: 'Society has no coordinates set. Add them in Settings first.' });
		}

		const result = await warmLocalTiles(society.lat, society.lng);

		return {
			warmSuccess: true,
			fetched: result.fetched,
			alreadyCached: result.alreadyCached,
			failed: result.failed,
			concurrency: 8
		};
	}, {
		legacyKey: 'warmError',
		fallbackCode: 'MAP_WARM_CACHE_FAILED',
		fallbackMessage: 'Unable to warm tile cache'
	})
};
