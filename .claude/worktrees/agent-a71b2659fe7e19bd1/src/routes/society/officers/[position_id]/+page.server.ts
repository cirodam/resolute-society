import { randomUUID } from 'crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { error, fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = repositories.positions.findSociety(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const position = repositories.positions.findPositionDetail(params.position_id, resolveSocietyId(undefined));

	if (!position) {
		throw error(404, 'Position not found');
	}

	const subordinates = repositories.positions.listSubordinates(params.position_id);
	const eligibleMembers = repositories.positions.listEligibleMembers(resolveSocietyId(undefined));
	const currentPermissions = repositories.positions.listCurrentPermissions(params.position_id);
	const allPermissions = repositories.positions.listAllPermissions();

	return {
		society,
		position,
		subordinates,
		eligibleMembers,
		currentPermissions,
		allPermissions
	};
};

export const actions: Actions = {
	assign: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'positions.assign_person', resolveSocietyId(undefined));

		const formData = await request.formData();
		const personId = formData.get('person_id')?.toString();

		if (!personId) {
			return fail(400, { message: 'Person required' });
		}

		const repositories = getRepositories();
		if (repositories.positions.isPersonInCurrentAssembly(personId, resolveSocietyId(undefined))) {
			return fail(400, { message: 'Assembly members cannot be officers' });
		}

		const position = repositories.positions.findPositionTerm(params.position_id);
		if (!position) {
			return fail(404, { message: 'Position not found' });
		}

		const appointedAt = new Date();
		const expiresAt = new Date(appointedAt);
		expiresAt.setFullYear(expiresAt.getFullYear() + position.term_limit_years);

		repositories.positions.assignPerson(
			params.position_id,
			personId,
			appointedAt.toISOString(),
			expiresAt.toISOString()
		);

		return { success: true };
	},

	remove: async (event) => {
		const { params } = event;
		requirePermission(event, 'positions.remove_person', resolveSocietyId(undefined));

		getRepositories().positions.clearAppointment(params.position_id);

		return { success: true };
	},

	createSubordinate: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'positions.create_subordinate', resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString();
		const description = formData.get('description')?.toString() || null;
		const section = formData.get('section')?.toString() || null;
		const termLimitYears = parseInt(formData.get('term_limit_years')?.toString() || '2');
		const defaultAllowance = parseFloat(formData.get('default_allowance')?.toString() || '0');

		if (!name || termLimitYears < 1 || defaultAllowance < 0) {
			return fail(400, { error: 'Invalid position data' });
		}

		const repositories = getRepositories();
		const parent = repositories.positions.findParentPosition(params.position_id);
		if (!parent) {
			return fail(404, { error: 'Parent position not found' });
		}

		const childType = parent.type === 'officer' ? 'section_chief' : 'line_worker';

		if (repositories.positions.positionExistsInSociety(parent.society_id, name)) {
			return fail(400, { error: 'Position with this name already exists' });
		}

		repositories.positions.createSubordinatePosition({
			societyId: parent.society_id,
			parentPositionId: params.position_id,
			childType,
			positionId: randomUUID(),
			name,
			description,
			section,
			termLimitYears,
			defaultAllowance
		});

		return { success: true };
	},

	grantPermission: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const permissionId = formData.get('permission_id')?.toString();

		if (!permissionId) {
			return fail(400, { error: 'Permission required' });
		}

		const repositories = getRepositories();
		const position = repositories.positions.findPositionSociety(params.position_id);
		if (!position || position.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { error: 'Position not found' });
		}

		repositories.positions.grantPermission(params.position_id, permissionId);

		return { success: true };
	},

	revokePermission: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const permissionId = formData.get('permission_id')?.toString();

		if (!permissionId) {
			return fail(400, { error: 'Permission required' });
		}

		const repositories = getRepositories();
		const position = repositories.positions.findPositionSociety(params.position_id);
		if (!position || position.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { error: 'Position not found' });
		}

		repositories.positions.revokePermission(params.position_id, permissionId);

		return { success: true };
	}
};
