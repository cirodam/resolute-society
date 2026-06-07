import { error, fail } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFederationBalance } from '$lib/server/federation/client';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const person = repositories.people.findDetailById(params.id);
	const society = person ? repositories.societies.findDetailById(person.society_id) : null;

	if (!person || person.membership_status === 'deleted' || !society) {
		throw error(404, 'Person not found');
	}

	const societyCredits = calculateBalance('person', params.id);
	const federationCredits = await getFederationBalance(`${person.handle}@${society.handle}`);

	return {
		person: {
			...person,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		associations: repositories.people.listAssociations(params.id),
		isOwnProfile: locals.person?.id === params.id
	};
};

export const actions: Actions = {
	updateBio: async ({ request, params, locals }) => {
		if (locals.person?.id !== params.id) {
			return fail(403, { message: 'You can only edit your own profile' });
		}

		const formData = await request.formData();
		const bio = formData.get('bio')?.toString() || null;

		getRepositories().people.updateBio(params.id, bio);

		return { success: true };
	},

	updateMembershipStatus: async ({ request, params }) => {
		const formData = await request.formData();
		const status = formData.get('status')?.toString();

		const validStatuses = ['provisional', 'full', 'suspended', 'inactive'];
		if (!status || !validStatuses.includes(status)) {
			return fail(400, { statusError: 'Invalid membership status' });
		}

		getRepositories().people.updateMembershipStatus(params.id, status);

		return { statusSuccess: true };
	}
};
