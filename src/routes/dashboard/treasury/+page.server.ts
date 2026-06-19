import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getSupplySnapshot } from '$lib/server/economy/reconciliation';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';
import { reconciliationActions } from './economy.actions';

export const load: PageServerLoad = async () => {
	const repositories = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repositories.treasury.findSocietyById(societyId);

	if (!society) throw error(404, 'Society not found');

	const [summary, supplySnapshot, federationCredits, totalFedSupply, memberCount] = await Promise.all([
		repositories.treasury.calculateSummary(societyId),
		getSupplySnapshot(societyId),
		repositories.fedLedger.getFedBalance(`treasury@${society.handle}`),
		repositories.fedLedger.getTotalFedSupplyForSociety(society.handle),
		repositories.treasury.getMemberCount(societyId)
	]);

	return {
		society: { ...society, society_credits: summary.societyCredits, federation_credits: federationCredits },
		totalMoneySupply: summary.totalSupply,
		expectedMoneySupply: supplySnapshot.expectedSupply,
		supplyExcess: supplySnapshot.supplyExcess,
		supplyShortfall: supplySnapshot.supplyShortfall,
		totalFedSupply,
		expectedFedSupply: memberCount * 60_000
	};
};

export const actions: Actions = { ...reconciliationActions };
