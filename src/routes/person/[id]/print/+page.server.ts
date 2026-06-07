import { error } from '@sveltejs/kit';
import { calculateAgeYears } from '$lib/server/economy/endowment';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repos = getRepositories();
	const person = await repos.people.findDetailById(params.id);

	if (!person || person.membership_status === 'deleted') {
		throw error(404, 'Person not found');
	}

	const society = await repos.societies.findById(person.society_id);
	if (!society) throw error(404, 'Society not found');

	return {
		society,
		person,
		age: calculateAgeYears(person.dob),
		associations: await repos.people.listAssociations(params.id),
		dependants: await repos.dependants.listByGuardian(params.id),
		printedAt: new Date().toISOString()
	};
};
