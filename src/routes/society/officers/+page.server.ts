import { randomUUID } from 'crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { error, fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = await repositories.positions.findSociety(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const positions = await repositories.positions.listOfficerPositions(resolveSocietyId(undefined));

	return {
		society,
		positions
	};
};

export const actions: Actions = {
	createPosition: async (event) => {
		const { request, params } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const description = formData.get('description')?.toString() || null;
		const termLimitYears = parseInt(formData.get('term_limit_years')?.toString() || '2');
		const defaultAllowance = parseFloat(formData.get('default_allowance')?.toString() || '0');

		if (!name || termLimitYears < 1 || defaultAllowance < 0) {
			return fail(400, { error: 'Invalid position data' });
		}

		const repositories = getRepositories();
		if (await repositories.positions.positionExistsInSociety(resolveSocietyId(undefined), name)) {
			return fail(400, { error: 'Position with this name already exists' });
		}

		await repositories.positions.createOfficerPosition({
			societyId: resolveSocietyId(undefined),
			positionId: randomUUID(),
			name,
			description,
			termLimitYears,
			defaultAllowance
		});

		return { success: true };
	}
};
