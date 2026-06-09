import { error, fail, redirect } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { enqueueFederationMessage } from '$lib/server/federation/client';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) {
		throw redirect(303, '/login');
	}

	const society = await getRepositories().societies.findDetailById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society
	};
};

export const actions = {
	updateSociety: async ({ request }) => {
		const data = await request.formData();
		const handle = data.get('handle')?.toString().trim().toLowerCase();
		const name = data.get('name')?.toString().trim();
		const address = data.get('address')?.toString().trim() || null;
		const lat = data.get('lat')?.toString();
		const lng = data.get('lng')?.toString();
		const federationIpAddress = data.get('federation_ip_address')?.toString().trim() || null;

		if (!handle) return fail(400, { error: 'Handle is required' });
		if (!/^[a-z0-9-]+$/.test(handle)) return fail(400, { error: 'Handle may only contain lowercase letters, numbers, and hyphens' });
		if (!name) return fail(400, { error: 'Name is required' });

		const societyId = resolveSocietyId(undefined);
		const repos = getRepositories();
		const previousSociety = await repos.societies.findDetailById(societyId);
		if (!previousSociety) {
			throw error(404, 'Society not found');
		}

		const existing = await repos.societies.findByHandle(handle);
		if (existing && existing.id !== societyId) {
			return fail(400, { error: 'That handle is already taken' });
		}

		const latValue = lat ? parseFloat(lat) : null;
		const lngValue = lng ? parseFloat(lng) : null;

		await repos.societies.updateSociety({
			societyId,
			handle,
			name,
			address,
			lat: latValue,
			lng: lngValue,
			federationIpAddress
		});

		const locationChanged =
			previousSociety.address !== address ||
			previousSociety.lat !== latValue ||
			previousSociety.lng !== lngValue;

		if (locationChanged) {
			const memberCount = await repos.people.countBySociety(societyId);
			enqueueFederationMessage('society_heartbeat', handle, {
				societyId,
				name,
				handle,
				address,
				lat: latValue,
				lng: lngValue,
				memberCount
			});
		}

		return { success: true };
	}
} satisfies Actions;
