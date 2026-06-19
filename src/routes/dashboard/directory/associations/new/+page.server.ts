import { PERMISSION } from '$lib/permissions';
import { requirePermission } from '$lib/server/services/auth.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
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
		const { request, locals } = event;
		await requirePermission(event, PERMISSION.MEMBERSHIP_CREATE_ASSOCIATION, resolveSocietyId(undefined));

		const data = await request.formData();
		const handle = data.get('handle')?.toString().trim();
		const name = data.get('name')?.toString().trim();
		const type = data.get('type')?.toString().trim() || null;
		const specialType = data.get('special_type')?.toString() || 'none';
		const locationId = data.get('location_id')?.toString() || null;
		const founderHandle = data.get('founder_handle')?.toString().trim();

		if (!handle || !name) {
			return fail(400, { error: 'Handle and name are required' });
		}
		if (!founderHandle) {
			return fail(400, { error: 'A founding member handle is required' });
		}

		const societyId = resolveSocietyId(undefined);
		const repositories = getRepositories();

		if (await repositories.associations.handleExists(handle)) {
			return fail(400, { error: 'Handle already taken' });
		}

		const founder = await repositories.people.findByHandleAndSociety(founderHandle, societyId);
		if (!founder) {
			return fail(400, { error: `No member found with handle @${founderHandle}` });
		}

		const associationId = randomUUID();
		await repositories.associations.createAssociation({
			associationId,
			societyId,
			handle,
			name,
			type,
			specialType,
			locationId
		});

		await repositories.associations.addMember(associationId, founder.id);

		await audit({
			actor: locals.person,
			societyId,
			eventType: 'ASSOCIATION_CREATED',
			targetType: 'association',
			targetId: associationId,
			summary: `Association "${name}" (@${handle}) created with founding member @${founderHandle}`,
			metadata: { handle, name, type, specialType, founderHandle }
		});

		throw redirect(303, `/association/${associationId}`);
	}
} satisfies Actions;
