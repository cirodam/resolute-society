import type postgres from 'postgres';
import { randomUUID } from 'crypto';

export type PermissionDefinition = {
	code: string;
	name: string;
	category: string;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
	{ code: 'treasury.run_demurrage', name: 'Run Demurrage', category: 'treasury' },
	{ code: 'treasury.transfer', name: 'Transfer Credits', category: 'treasury' },
	{ code: 'treasury.run_allowance_group', name: 'Run Allowance Group', category: 'treasury' },
	{
		code: 'treasury.create_allowance_group',
		name: 'Create Allowance Group',
		category: 'treasury'
	},
	{
		code: 'treasury.delete_allowance_group',
		name: 'Delete Allowance Group',
		category: 'treasury'
	},
	{
		code: 'treasury.manage_allowance_members',
		name: 'Manage Allowance Members',
		category: 'treasury'
	},
	{
		code: 'treasury.run_position_payroll',
		name: 'Run Position Payroll',
		category: 'treasury'
	},
	{
		code: 'treasury.adjust_position_allowance',
		name: 'Adjust Position Allowance',
		category: 'treasury'
	},
	{
		code: 'treasury.distribute_universal_allowance',
		name: 'Distribute Universal Allowance',
		category: 'treasury'
	},
	{ code: 'positions.create_officer', name: 'Create Officer Position', category: 'positions' },
	{ code: 'positions.assign_person', name: 'Assign Person to Position', category: 'positions' },
	{ code: 'positions.remove_person', name: 'Remove Person from Position', category: 'positions' },
	{
		code: 'positions.create_subordinate',
		name: 'Create Subordinate Position',
		category: 'positions'
	},
	{ code: 'assembly.assign_seat', name: 'Assign Assembly Seat', category: 'assembly' },
	{ code: 'assembly.unassign_seat', name: 'Unassign Assembly Seat', category: 'assembly' },
	{ code: 'membership.create_member', name: 'Create New Member', category: 'membership' },
	{ code: 'membership.remove_member', name: 'Remove Member', category: 'membership' },
	{ code: 'membership.run_sortition', name: 'Run Sortition', category: 'membership' },
	{ code: 'membership.create_association', name: 'Create Association', category: 'membership' },
	{ code: 'ledger.close_day', name: 'Close Daily Ledger', category: 'ledger' },
	{ code: 'governance.update_society', name: 'Update Society Settings', category: 'governance' },
	{ code: 'education.approve_course', name: 'Approve Course', category: 'education' }
];

export class PermissionRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async hasPermission(check: {
		personId: string;
		societyId: string;
		permissionCode: string;
	}): Promise<boolean> {
		const [society] = await this.sql<Array<{ founder_person_id: string | null }>>`
			SELECT founder_person_id FROM society_config WHERE id = ${check.societyId}`;

		if (society?.founder_person_id === check.personId) {
			return true;
		}

		const [result] = await this.sql`
			SELECT 1
			FROM position pos
			JOIN position_permission pp ON pp.position_id = pos.id
			JOIN permission perm ON perm.id = pp.permission_id
			WHERE pos.society_id = ${check.societyId}
			  AND pos.current_person_id = ${check.personId}
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

	async seedDefaultPositionPermissions(societyId: string): Promise<void> {
		await this.grantCategoryPermissionsToPosition(societyId, 'Treasurer', 'treasury');
		await this.grantCategoryPermissionsToPosition(societyId, 'Registrar', 'membership');
		await this.grantCategoryPermissionsToPosition(societyId, 'Education Director', 'education');
	}

	private async grantCategoryPermissionsToPosition(
		societyId: string,
		positionName: string,
		category: string
	): Promise<void> {
		const [position] = await this.sql<Array<{ id: string }>>`
			SELECT id FROM position WHERE society_id = ${societyId} AND name = ${positionName}`;

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
