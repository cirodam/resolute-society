import { PERMISSION } from '$lib/permissions';
import { randomUUID } from 'crypto';
import { requirePermission } from '$lib/server/services/auth.service';
import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repos = getRepositories();
	const unit = await repos.units.findSummaryById(params.unit_id);
	if (!unit) throw error(404, 'Unit not found');

	const [subUnits, positions, parentUnit] = await Promise.all([
		repos.units.listSubUnits(params.unit_id),
		repos.units.listPositions(params.unit_id),
		unit.parent_unit_id ? repos.units.findById(unit.parent_unit_id) : Promise.resolve(null)
	]);

	return { unit, subUnits, positions, parentUnit };
};

export const actions: Actions = {
	createSubUnit: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, PERMISSION.POSITIONS_CREATE_OFFICER, resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || null;

		if (!name) return fail(400, { createSubUnitError: 'Unit name is required' });

		const repos = getRepositories();
		if (await repos.units.nameExists(name)) {
			return fail(400, { createSubUnitError: 'A unit with this name already exists' });
		}

		const unitId = randomUUID();
		await repos.units.create({ id: unitId, name, description, parentUnitId: params.unit_id });

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'UNIT_CREATED',
			targetType: 'position',
			targetId: unitId,
			summary: `Sub-unit "${name}" created under unit ${params.unit_id}`,
			metadata: { name, description, parentUnitId: params.unit_id }
		});

		return { createSubUnitSuccess: true };
	},

	createPosition: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, PERMISSION.POSITIONS_CREATE_OFFICER, resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || null;
		const isUnitLeader = formData.get('is_unit_leader') === 'true';
		const termLimitYears = parseInt(formData.get('term_limit_years')?.toString() || '2');
		const defaultAllowance = parseFloat(formData.get('default_allowance')?.toString() || '0');

		if (!name || termLimitYears < 1 || defaultAllowance < 0) {
			return fail(400, { createPositionError: 'Invalid position data' });
		}

		const repos = getRepositories();
		if (await repos.positions.nameExistsInUnit(params.unit_id, name)) {
			return fail(400, { createPositionError: 'A position with this name already exists in this unit' });
		}

		const positionId = randomUUID();
		await repos.positions.create({
			id: positionId,
			unitId: params.unit_id,
			name,
			isUnitLeader,
			description,
			termLimitYears,
			defaultAllowance
		});

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'POSITION_CREATED',
			targetType: 'position',
			targetId: positionId,
			summary: `Position "${name}" created in unit ${params.unit_id}`,
			metadata: { name, description, isUnitLeader, termLimitYears, defaultAllowance }
		});

		return { createPositionSuccess: true };
	},

	updateUnit: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, PERMISSION.POSITIONS_CREATE_OFFICER, resolveSocietyId(undefined));

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim() || null;

		if (!name) return fail(400, { updateUnitError: 'Unit name is required' });

		const repos = getRepositories();
		const existing = await repos.units.findById(params.unit_id);
		if (!existing) return fail(404, { updateUnitError: 'Unit not found' });

		if (name !== existing.name && await repos.units.nameExists(name)) {
			return fail(400, { updateUnitError: 'A unit with this name already exists' });
		}

		await repos.units.update(params.unit_id, { name, description });

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'UNIT_UPDATED',
			targetType: 'position',
			targetId: params.unit_id,
			summary: `Unit renamed to "${name}"`,
			metadata: { name, description }
		});

		return { updateUnitSuccess: true };
	},

	deleteUnit: async (event) => {
		const { params, locals } = event;
		await requirePermission(event, PERMISSION.POSITIONS_CREATE_OFFICER, resolveSocietyId(undefined));

		const repos = getRepositories();
		if (await repos.units.hasSubUnits(params.unit_id)) {
			return fail(400, { deleteUnitError: 'Cannot delete a unit that has sub-units' });
		}
		if (await repos.units.hasPositions(params.unit_id)) {
			return fail(400, { deleteUnitError: 'Cannot delete a unit that has positions' });
		}

		const unit = await repos.units.findById(params.unit_id);
		await repos.units.delete(params.unit_id);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'UNIT_DELETED',
			targetType: 'position',
			targetId: params.unit_id,
			summary: `Unit "${unit?.name ?? params.unit_id}" deleted`,
			metadata: { unitId: params.unit_id }
		});

		const destination = unit?.parent_unit_id
			? `/dashboard/units/${unit.parent_unit_id}`
			: '/dashboard/units';
		redirect(303, destination);
	}
};
