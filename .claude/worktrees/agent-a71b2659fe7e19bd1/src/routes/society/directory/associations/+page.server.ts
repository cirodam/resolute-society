import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const repositories = getRepositories();
	const society = repositories.societies.findById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const associationQuery = (url.searchParams.get('association_q') || '').trim().toLowerCase();
	const allAssociations = repositories.associations.listBySociety(resolveSocietyId(undefined));
	const associations = associationQuery
		? allAssociations.filter((association) => {
				const type = association.type?.toLowerCase() || '';
				const description = association.description?.toLowerCase() || '';
				return (
					association.name.toLowerCase().includes(associationQuery) ||
					association.handle.toLowerCase().includes(associationQuery) ||
					type.includes(associationQuery) ||
					description.includes(associationQuery)
				);
		  })
		: allAssociations;

	return {
		society,
		associations,
		associationQuery,
		associationCount: allAssociations.length
	};
};
