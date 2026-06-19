import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';
import { demurrageAction } from '../economy.actions';

export const load: PageServerLoad = async () => {
	const repositories = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const summary = await repositories.treasury.calculateSummary(societyId);
	return { principalCredits: summary.principalCredits };
};

export const actions: Actions = { ...demurrageAction };
