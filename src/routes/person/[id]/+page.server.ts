import { error, fail, redirect } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { calculateEndowmentTarget } from '$lib/server/economy/endowment';
import { getFederationBalance } from '$lib/server/federation/client';
import { getRepositories } from '$lib/server/infra/repositories';
import { requirePermission } from '$lib/server/services/auth.service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const person = repositories.people.findDetailById(params.id);
	const society = person ? repositories.societies.findDetailById(person.society_id) : null;

	if (!person || person.membership_status === 'deleted' || !society) {
		throw error(404, 'Person not found');
	}

	const societyCredits = calculateBalance('person', params.id);
	const federationCredits = await getFederationBalance(`${person.id}@${society.id}`);

	const isFounder = repositories.societies.findFounderById(person.society_id)?.founder_person_id === locals.person?.id;
	const permissionCodes = isFounder
		? []
		: repositories.societies.listPermissionCodesForPerson(person.society_id, locals.person?.id ?? '');
	const canDelete =
		locals.person?.id !== params.id &&
		(isFounder || permissionCodes.includes('membership.create_member'));

	return {
		person: {
			...person,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		associations: repositories.people.listAssociations(params.id),
		isOwnProfile: locals.person?.id === params.id,
		canDelete
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
	},

	deleteMember: async (event) => {
		const { params, locals } = event;
		const repositories = getRepositories();
		const person = repositories.people.findDetailById(params.id);

		if (!person || person.membership_status === 'deleted') {
			return fail(404, { deleteError: 'Member not found' });
		}

		requirePermission(event, 'membership.create_member', person.society_id);

		if (locals.person?.id === params.id) {
			return fail(400, { deleteError: 'You cannot delete your own account' });
		}

		const founder = repositories.societies.findFounderById(person.society_id);
		if (founder?.founder_person_id === params.id) {
			return fail(400, { deleteError: 'Founder cannot be deleted' });
		}

		const balance = Math.max(0, calculateBalance('person', params.id));
		const endowmentTarget = calculateEndowmentTarget(person.dob);
		const burnAmount = Math.min(balance, endowmentTarget);
		const treasuryRemainder = Math.max(0, balance - burnAmount);

		if (burnAmount > 0) {
			repositories.ledger.createTransaction({
				fromType: 'person',
				fromId: params.id,
				toType: 'system',
				toId: 'burn',
				amount: burnAmount,
				note: 'Member deletion clawback burn'
			});
		}

		if (treasuryRemainder > 0) {
			repositories.ledger.createTransaction({
				fromType: 'person',
				fromId: params.id,
				toType: 'society',
				toId: person.society_id,
				amount: treasuryRemainder,
				note: 'Member deletion remainder transfer'
			});
		}

		repositories.positions.clearAppointmentsForPerson(params.id);
		repositories.assembly.removePersonFromAllSeats(params.id);
		repositories.associations.removeMembershipsForPerson(params.id);
		repositories.allowanceGroups.removePersonFromAll(params.id);
		repositories.people.markDeleted(params.id);

		redirect(303, '/society/directory/people');
	}
};
