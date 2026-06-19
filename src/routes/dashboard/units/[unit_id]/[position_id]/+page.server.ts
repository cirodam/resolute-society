import { requirePermission } from '$lib/server/services/auth.service';
import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repos = getRepositories();
	const [position, unit] = await Promise.all([
		repos.positions.findById(params.position_id),
		repos.units.findById(params.unit_id)
	]);

	if (!position || position.unit_id !== params.unit_id) throw error(404, 'Position not found');
	if (!unit) throw error(404, 'Unit not found');

	const [eligibleMembers, currentPermissions, allPermissions] = await Promise.all([
		repos.positions.listEligibleMembers(resolveSocietyId(undefined)),
		repos.positions.listCurrentPermissions(params.position_id),
		repos.positions.listAllPermissions()
	]);

	return { position, unit, eligibleMembers, currentPermissions, allPermissions };
};

export const actions: Actions = {
	assign: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'positions.assign_person', resolveSocietyId(undefined));

		const formData = await request.formData();
		const personId = formData.get('person_id')?.toString();
		if (!personId) return fail(400, { assignError: 'Person required' });

		const repos = getRepositories();
		if (await repos.assembly.isPersonInCurrentAssembly(personId, resolveSocietyId(undefined))) {
			return fail(400, { assignError: 'Assembly members cannot hold positions' });
		}

		const position = await repos.positions.findById(params.position_id);
		if (!position) return fail(404, { assignError: 'Position not found' });

		const appointedAt = new Date();
		const expiresAt = new Date(appointedAt);
		expiresAt.setFullYear(expiresAt.getFullYear() + position.term_limit_years);

		await repos.positions.assign(
			params.position_id,
			personId,
			appointedAt.toISOString(),
			expiresAt.toISOString()
		);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'OFFICER_ASSIGNED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Person assigned to position`,
			metadata: { positionId: params.position_id, personId }
		});

		return { assignSuccess: true };
	},

	remove: async (event) => {
		const { params, locals } = event;
		await requirePermission(event, 'positions.remove_person', resolveSocietyId(undefined));

		await getRepositories().positions.clearAppointment(params.position_id);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'OFFICER_REMOVED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Person removed from position`,
			metadata: { positionId: params.position_id }
		});

		return { removeSuccess: true };
	},

	updatePosition: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || null;
		const isUnitLeader = formData.get('is_unit_leader') === 'true';
		const termLimitYears = parseInt(formData.get('term_limit_years')?.toString() || '2');
		const defaultAllowance = parseFloat(formData.get('default_allowance')?.toString() || '0');

		if (!name || termLimitYears < 1 || defaultAllowance < 0) {
			return fail(400, { updatePositionError: 'Invalid position data' });
		}

		const repos = getRepositories();
		const existing = await repos.positions.findById(params.position_id);
		if (!existing) return fail(404, { updatePositionError: 'Position not found' });

		if (name !== existing.name && await repos.positions.nameExistsInUnit(params.unit_id, name)) {
			return fail(400, { updatePositionError: 'A position with this name already exists in this unit' });
		}

		await repos.positions.update(params.position_id, { name, isUnitLeader, description, termLimitYears, defaultAllowance });

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'POSITION_UPDATED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Position "${name}" updated`,
			metadata: { name, description, isUnitLeader, termLimitYears, defaultAllowance }
		});

		return { updatePositionSuccess: true };
	},

	grantPermission: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const permissionId = formData.get('permission_id')?.toString();
		if (!permissionId) return fail(400, { grantError: 'Permission required' });

		await getRepositories().positions.grantPermission(params.position_id, permissionId);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'PERMISSION_GRANTED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Permission granted to position`,
			metadata: { positionId: params.position_id, permissionId }
		});

		return { grantSuccess: true };
	},

	revokePermission: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const formData = await request.formData();
		const permissionId = formData.get('permission_id')?.toString();
		if (!permissionId) return fail(400, { revokeError: 'Permission required' });

		await getRepositories().positions.revokePermission(params.position_id, permissionId);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'PERMISSION_REVOKED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Permission revoked from position`,
			metadata: { positionId: params.position_id, permissionId }
		});

		return { revokeSuccess: true };
	},

	deletePosition: async (event) => {
		const { params, locals } = event;
		await requirePermission(event, 'positions.create_officer', resolveSocietyId(undefined));

		const repos = getRepositories();
		const position = await repos.positions.findById(params.position_id);
		if (position?.current_person_id) {
			return fail(400, { deletePositionError: 'Cannot delete a position with an active appointment' });
		}

		await repos.positions.delete(params.position_id);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'POSITION_DELETED',
			targetType: 'position',
			targetId: params.position_id,
			summary: `Position "${position?.name}" deleted`,
			metadata: { positionId: params.position_id }
		});

		redirect(303, `/dashboard/units/${params.unit_id}`);
	}
};
