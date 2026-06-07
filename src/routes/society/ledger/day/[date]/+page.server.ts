import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);

	const society = await repos.societies.findById(societyId);
	if (!society) throw error(404, 'Society not found');

	const day = await repos.ledgerDays.findByDate(societyId, params.date);
	if (!day) throw error(404, 'No ledger record for this date');

	const transactions = await repos.ledger.listForDate(params.date);

	const closingBalance = day.status === 'open'
		? null
		: day.closing_balance;

	const totalSupply = day.status === 'open'
		? null
		: day.total_supply;

	return {
		society,
		day,
		transactions,
		closingBalance,
		totalSupply
	};
};
