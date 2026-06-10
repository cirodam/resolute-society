import { error } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFederationBalanceWithMeta } from '$lib/server/federation/client';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const association = await repositories.associations.findById(params.id);
	const society = association ? await repositories.societies.findDetailById(association.society_id) : null;

	if (!association || !society) {
		throw error(404, 'Association not found');
	}

	const societyCredits = await calculateBalance('association', params.id);
	const federationBalanceRead = await getFederationBalanceWithMeta(`${association.id}@${society.id}`);
	const federationCredits = federationBalanceRead.balance;

	return {
		association: {
			...association,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		federationRead: {
			balanceDegraded: federationBalanceRead.degraded,
			balanceReason: federationBalanceRead.reason,
			balanceStatus: federationBalanceRead.status
		},
		members: await repositories.associations.listMembers(params.id)
	};
};
