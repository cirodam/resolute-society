import { PERMISSION } from '$lib/permissions';
import { error, fail, redirect } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { MEMBER_ENDOWMENT } from '$lib/server/economy/endowment';
import { getRepositories } from '$lib/server/infra/repositories';
import { requirePermission } from '$lib/server/services/auth.service';
import { audit } from '$lib/server/services/audit.service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const person = await repositories.people.findProfileById(params.id);
	const society = person ? await repositories.societies.findDetailById(person.society_id) : null;

	if (!person || person.membership_status === 'deleted' || !society) {
		throw error(404, 'Person not found');
	}

	const societyCredits = await calculateBalance('person', params.id);
	const federationCredits = await repositories.fedLedger.getFedBalance(`${person.handle}@${society.handle}`);

	const founderRecord = await repositories.societies.findFounderById(person.society_id);
	const isFounder = founderRecord?.founder_person_id === locals.person?.id;
	const permissionCodes = isFounder
		? []
		: await repositories.societies.listPermissionCodesForPerson(person.society_id, locals.person?.id ?? '');
	const canDelete =
		locals.person?.id !== params.id &&
		(isFounder || permissionCodes.includes(PERMISSION.MEMBERSHIP_CREATE_MEMBER));

	return {
		person: {
			...person,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		associations: await repositories.people.listAssociations(params.id),
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

		await getRepositories().people.updateBio(params.id, bio);

		return { success: true };
	},

	updateMembershipStatus: async ({ request, params, locals }) => {
		const formData = await request.formData();
		const status = formData.get('status')?.toString();

		const validStatuses = ['provisional', 'full', 'suspended', 'inactive'];
		if (!status || !validStatuses.includes(status)) {
			return fail(400, { statusError: 'Invalid membership status' });
		}

		const repos = getRepositories();
		const person = await repos.people.findProfileById(params.id);
		await repos.people.updateMembershipStatus(params.id, status);

		await audit({
			actor: locals.person,
			societyId: person?.society_id ?? '',
			eventType: 'MEMBER_STATUS_CHANGED',
			targetType: 'person',
			targetId: params.id,
			summary: `Member status changed to "${status}"`,
			metadata: { personId: params.id, status, prev: person?.membership_status }
		});

		return { statusSuccess: true };
	},

	deleteMember: async (event) => {
		const { params, locals } = event;
		const repositories = getRepositories();
		const person = await repositories.people.findProfileById(params.id);

		if (!person || person.membership_status === 'deleted') {
			return fail(404, { deleteError: 'Member not found' });
		}

		await requirePermission(event, PERMISSION.MEMBERSHIP_CREATE_MEMBER, person.society_id);

		if (locals.person?.id === params.id) {
			return fail(400, { deleteError: 'You cannot delete your own account' });
		}

		const founder = await repositories.societies.findFounderById(person.society_id);
		if (founder?.founder_person_id === params.id) {
			return fail(400, { deleteError: 'Founder cannot be deleted' });
		}

		const memberBalance = Math.max(0, await calculateBalance('person', params.id));
		if (memberBalance > 0) {
			await repositories.ledger.createTransaction({
				fromType: 'person',
				fromId: params.id,
				toType: 'society',
				toId: person.society_id,
				amount: memberBalance,
				note: 'Member departure: balance returned to treasury'
			});
		}

		const treasuryBalance = await calculateBalance('society', person.society_id);
		if (treasuryBalance >= MEMBER_ENDOWMENT) {
			await repositories.ledger.createTransaction({
				fromType: 'society',
				fromId: person.society_id,
				toType: 'system',
				toId: 'burn',
				amount: MEMBER_ENDOWMENT,
				note: 'Member departure: endowment burn'
			});
		}

		await repositories.positions.clearAppointmentsForPerson(params.id);
		await repositories.assembly.removePersonFromAllSeats(params.id);
		await repositories.associations.removeMembershipsForPerson(params.id);
		await repositories.allowanceGroups.removePersonFromAll(params.id);
		await repositories.people.markDeleted(params.id);

		await audit({
			actor: locals.person,
			societyId: person.society_id,
			eventType: 'MEMBER_DELETED',
			targetType: 'person',
			targetId: params.id,
			summary: `Member ${person.given_name} ${person.surname} (@${person.handle}) deleted`,
			metadata: { personId: params.id, handle: person.handle, givenName: person.given_name, surname: person.surname }
		});

		redirect(303, '/dashboard/directory/people');
	}
};
