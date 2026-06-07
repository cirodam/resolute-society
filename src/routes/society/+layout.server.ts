import { redirect } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.person) {
		throw redirect(303, '/login');
	}

	const societyId = resolveSocietyId(undefined);

	if (locals.person.society_id !== societyId) {
		throw redirect(303, '/society');
	}

	const repositories = getRepositories();
	const society = await repositories.societies.findFounderById(societyId);
	const isFounder = society?.founder_person_id === locals.person.id;

	let permissionCodes: string[] = [];
	if (!isFounder) {
		permissionCodes = await repositories.societies.listPermissionCodesForPerson(societyId, locals.person.id);
	}

	return {
		person: locals.person,
		permissions: {
			societyId,
			isFounder,
			codes: permissionCodes
		}
	};
};
