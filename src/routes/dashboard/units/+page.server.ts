import { randomUUID } from 'crypto';
import { requirePermission } from '$lib/server/services/auth.service';
import { fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const rootUnits = await repos.units.listRoots();
	return { rootUnits };
};

export const actions: Actions = {
	createUnit: async (event) => {
		const { request, locals } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || null;

		if (!name) return fail(400, { error: 'Unit name is required' });

		const repos = getRepositories();
		if (await repos.units.nameExists(name)) {
			return fail(400, { error: 'A unit with this name already exists' });
		}

		const unitId = randomUUID();
		await repos.units.create({ id: unitId, name, description, parentUnitId: null });

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'UNIT_CREATED',
			targetType: 'position',
			targetId: unitId,
			summary: `Unit "${name}" created`,
			metadata: { name, description }
		});

		return { success: true };
	}
};
