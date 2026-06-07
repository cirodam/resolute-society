import { requirePermission } from '$lib/server/services/auth.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);

	if (!society) throw error(404, 'Society not found');

	return {
		society,
		locations: await repos.locations.listBySociety(societyId)
	};
};

export const actions = {
	default: async (event) => {
		const { request, params } = event;
		await requirePermission(event, 'membership.create_association', resolveSocietyId(undefined));

		const data = await request.formData();
		const handle = data.get('handle')?.toString();
		const name = data.get('name')?.toString();
		const type = data.get('type')?.toString() || null;
		const specialType = data.get('special_type')?.toString() || 'none';
		const locationId = data.get('location_id')?.toString() || null;

		if (!handle || !name) {
			return fail(400, { error: 'Handle and name are required' });
		}

		const repositories = getRepositories();
		if (await repositories.associations.handleExists(handle)) {
			return fail(400, { error: 'Handle already taken' });
		}

		await repositories.associations.createAssociation({
			associationId: randomUUID(),
			societyId: resolveSocietyId(undefined),
			handle,
			name,
			type,
			specialType,
			locationId
		});

		throw redirect(303, `/society/directory`);
	}
} satisfies Actions;
