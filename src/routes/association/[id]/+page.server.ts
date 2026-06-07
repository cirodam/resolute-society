import { error } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFederationBalance } from '$lib/server/federation/client';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const association = repositories.associations.findById(params.id);
	const society = association ? repositories.societies.findDetailById(association.society_id) : null;

	if (!association || !society) {
		throw error(404, 'Association not found');
	}

	const societyCredits = calculateBalance('association', params.id);
	const federationCredits = await getFederationBalance(`${association.id}@${society.id}`);

	return {
		association: {
			...association,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		members: repositories.associations.listMembers(params.id)
	};
};
