import { requirePermission } from '$lib/server/services/auth.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { enqueueFederationMessage } from '$lib/server/federation/client';
import { createMember } from '$lib/server/services/member.service';
import { parseSex } from '$lib/server/utils/form.util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = repos.societies.findById(societyId);

	if (!society) throw error(404, 'Society not found');

	return {
		society,
		locations: repos.locations.listBySociety(societyId)
	};
};

export const actions = {
	default: async (event) => {
		const societyId = resolveSocietyId(undefined);
		requirePermission(event, 'membership.create_member', societyId);

		const data = await event.request.formData();
		const handle   = data.get('handle')?.toString();
		const givenName = data.get('given_name')?.toString();
		const surname  = data.get('surname')?.toString();
		const password = data.get('password')?.toString();
		const dob      = data.get('dob')?.toString() || null;
		const sex      = parseSex(data.get('sex'));
		const locationId = data.get('location_id')?.toString() || null;
		const membershipStatus = (data.get('membership_status')?.toString() || 'provisional') as 'provisional' | 'full';

		if (!handle || !givenName || !surname || !password)
			return fail(400, { error: 'Handle, given name, surname, and password are required' });
		if (sex === 'invalid')
			return fail(400, { error: 'Invalid sex value' });

		const repos = getRepositories();
		if (repos.people.handleExists(handle))
			return fail(400, { error: 'Handle already taken' });

		const { personId, publicKey, age } = await createMember({
			societyId,
			handle,
			givenName,
			surname,
			password,
			dob,
			sex,
			locationId,
			membershipStatus
		});

		const societyDetail = repos.societies.findDetailById(societyId);
		if (societyDetail) {
			const memberCount = repos.people.countBySociety(societyId);
			enqueueFederationMessage('society_heartbeat', societyDetail.handle, {
				societyId,
				name: societyDetail.name,
				handle: societyDetail.handle,
				address: societyDetail.address,
				lat: societyDetail.lat,
				lng: societyDetail.lng,
				memberCount
			});
			enqueueFederationMessage('person_joined', societyDetail.handle, {
				personHandle: handle,
				personId,
				age,
				publicKey
			});
		}

		throw redirect(303, '/society/directory');
	}
} satisfies Actions;
