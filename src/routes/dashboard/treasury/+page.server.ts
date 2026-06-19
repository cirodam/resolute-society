import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getSupplySnapshot } from '$lib/server/economy/reconciliation';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';
import { economyActions } from './economy.actions';
import { transferActions } from './transfer.actions';
import { allowanceActions } from './allowance.actions';
import { payrollActions } from './payroll.actions';

export const load: PageServerLoad = async () => {
	const repositories = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repositories.treasury.findSocietyById(societyId);

	if (!society) throw error(404, 'Society not found');

	const [summary, supplySnapshot, federationCredits, allowanceGroups, members, groupMembers, positions, memberCount] =
		await Promise.all([
			repositories.treasury.calculateSummary(societyId),
			getSupplySnapshot(societyId),
			repositories.fedLedger.getFedBalance(`treasury@${society.handle}`),
			repositories.allowanceGroups.listBySociety(societyId),
			repositories.treasury.listSocietyMembers(societyId),
			repositories.allowanceGroups.listMembers(societyId),
			repositories.positions.listForPayroll(),
			repositories.treasury.getMemberCount(societyId)
		]);

	const membersByGroup = groupMembers.reduce(
		(acc, gm) => {
			if (!acc[gm.group_id]) acc[gm.group_id] = [];
			acc[gm.group_id].push(gm);
			return acc;
		},
		{} as Record<string, typeof groupMembers>
	);

	return {
		society: { ...society, society_credits: summary.societyCredits, federation_credits: federationCredits },
		totalMoneySupply: summary.totalSupply,
		expectedMoneySupply: supplySnapshot.expectedSupply,
		supplyExcess: supplySnapshot.supplyExcess,
		supplyShortfall: supplySnapshot.supplyShortfall,
		principalCredits: summary.principalCredits,
		allowanceGroups,
		members,
		membersByGroup,
		positions,
		memberCount
	};
};

export const actions: Actions = {
	...economyActions,
	...transferActions,
	...allowanceActions,
	...payrollActions
};
