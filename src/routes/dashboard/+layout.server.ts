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
		throw redirect(303, '/dashboard');
	}

	const repositories = getRepositories();
	const [societyIdentity, societyFounder] = await Promise.all([
		repositories.societies.findById(societyId),
		repositories.societies.findFounderById(societyId)
	]);
	const isFounder = societyFounder?.founder_person_id === locals.person.id;

	let permissionCodes: string[] = [];
	if (!isFounder) {
		permissionCodes = await repositories.societies.listPermissionCodesForPerson(societyId, locals.person.id);
	}

	return {
		person: locals.person,
		societyName: societyIdentity?.name ?? 'The Resolute Society',
		permissions: {
			societyId,
			isFounder,
			codes: permissionCodes
		}
	};
};
