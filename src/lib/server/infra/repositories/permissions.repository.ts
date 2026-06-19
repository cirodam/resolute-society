import { PERMISSION, type PermissionCode } from '$lib/permissions';
import type postgres from 'postgres';
import { randomUUID } from 'crypto';

export type PermissionDefinition = {
	code: PermissionCode;
	name: string;
	category: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
	{ code: PERMISSION.TREASURY_RUN_DEMURRAGE, name: 'Run Demurrage', category: 'treasury' },
	{ code: PERMISSION.TREASURY_TRANSFER, name: 'Transfer Credits', category: 'treasury' },
	{ code: PERMISSION.TREASURY_RUN_ALLOWANCE_GROUP, name: 'Run Allowance Group', category: 'treasury' },
	{
		code: PERMISSION.TREASURY_CREATE_ALLOWANCE_GROUP,
		name: 'Create Allowance Group',
		category: 'treasury'
	},
	{
		code: PERMISSION.TREASURY_DELETE_ALLOWANCE_GROUP,
		name: 'Delete Allowance Group',
		category: 'treasury'
	},
	{
		code: PERMISSION.TREASURY_MANAGE_ALLOWANCE_MEMBERS,
		name: 'Manage Allowance Members',
		category: 'treasury'
	},
	{
		code: PERMISSION.TREASURY_RUN_POSITION_PAYROLL,
		name: 'Run Position Payroll',
		category: 'treasury'
	},
	{
		code: PERMISSION.TREASURY_ADJUST_POSITION_ALLOWANCE,
		name: 'Adjust Position Allowance',
		category: 'treasury'
	},
	{
		code: PERMISSION.TREASURY_DISTRIBUTE_UNIVERSAL_ALLOWANCE,
		name: 'Distribute Universal Allowance',
		category: 'treasury'
	},
	{ code: PERMISSION.POSITIONS_CREATE_OFFICER, name: 'Create Officer Position', category: 'positions' },
	{ code: PERMISSION.POSITIONS_ASSIGN_PERSON, name: 'Assign Person to Position', category: 'positions' },
	{ code: PERMISSION.POSITIONS_REMOVE_PERSON, name: 'Remove Person from Position', category: 'positions' },
	{ code: PERMISSION.ASSEMBLY_ASSIGN_SEAT, name: 'Assign Assembly Seat', category: 'assembly' },
	{ code: PERMISSION.ASSEMBLY_UNASSIGN_SEAT, name: 'Unassign Assembly Seat', category: 'assembly' },
	{ code: PERMISSION.MEMBERSHIP_CREATE_MEMBER, name: 'Create New Member', category: 'membership' },
	{ code: PERMISSION.MEMBERSHIP_RUN_SORTITION, name: 'Run Sortition', category: 'membership' },
	{ code: PERMISSION.MEMBERSHIP_CREATE_ASSOCIATION, name: 'Create Association', category: 'membership' },
	{ code: PERMISSION.LEDGER_CLOSE_DAY, name: 'Close Daily Ledger', category: 'ledger' },
	{ code: PERMISSION.EDUCATION_APPROVE_COURSE, name: 'Approve Course', category: 'education' }
];

export class PermissionRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async hasPermission(check: {
		personId: string;
		societyId: string;
		permissionCode: string;
	}): Promise<boolean> {
		const [founder] = await this.sql<Array<{ value: string }>>`
			SELECT value FROM society_config WHERE key = 'society.founder_person_id'`;

		if (founder?.value === check.personId) {
			return true;
		}

		const [result] = await this.sql`
			SELECT 1
			FROM position pos
			JOIN position_permission pp ON pp.position_id = pos.id
			JOIN permission perm ON perm.id = pp.permission_id
			WHERE pos.current_person_id = ${check.personId}
			  AND perm.code = ${check.permissionCode}
			LIMIT 1`;

		return !!result;
	}

	async seedPermissions(): Promise<void> {
		for (const permission of PERMISSION_DEFINITIONS) {
			const [existing] = await this.sql`SELECT id FROM permission WHERE code = ${permission.code}`;

			if (!existing) {
				await this.sql`
					INSERT INTO permission (id, code, name, description, category)
					VALUES (${randomUUID()}, ${permission.code}, ${permission.name}, ${null}, ${permission.category})`;
			}
		}
	}

	async seedDefaultPositionPermissions(): Promise<void> {
		await this.grantCategoryPermissionsToPosition('Treasurer', 'treasury');
		await this.grantCategoryPermissionsToPosition('Registrar', 'membership');
		await this.grantCategoryPermissionsToPosition('Education Director', 'education');
	}

	private async grantCategoryPermissionsToPosition(
		positionName: string,
		category: string
	): Promise<void> {
		const [position] = await this.sql<Array<{ id: string }>>`
			SELECT id FROM position WHERE name = ${positionName} LIMIT 1`;

		if (!position) {
			return;
		}

		const permissions = PERMISSION_DEFINITIONS.filter((permission) => permission.category === category);
		for (const permission of permissions) {
			const [permRow] = await this.sql<Array<{ id: string }>>`SELECT id FROM permission WHERE code = ${permission.code}`;

			if (permRow) {
				await this.sql`
					INSERT INTO position_permission (position_id, permission_id)
					VALUES (${position.id}, ${permRow.id})
					ON CONFLICT DO NOTHING`;
			}
		}
	}
}
