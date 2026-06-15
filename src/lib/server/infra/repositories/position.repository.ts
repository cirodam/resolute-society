import type postgres from 'postgres';

export interface PositionDetailRow {
	id: string;
	unit_id: string;
	unit_name: string;
	name: string;
	is_unit_leader: boolean;
	description: string | null;
	term_limit_years: number;
	current_person_id: string | null;
	given_name: string | null;
	surname: string | null;
	handle: string | null;
	appointed_at: Date | null;
	term_expires_at: Date | null;
	default_allowance: number;
	current_allowance: number;
	allowance_modification_reason: string | null;
}

export interface EligibleMemberRow {
	id: string;
	given_name: string;
	surname: string;
	handle: string;
}

export interface PermissionRow {
	id: string;
	code: string;
	name: string;
	category: string;
}

export interface PositionPayrollRow {
	id: string;
	unit_name: string;
	name: string;
	description: string | null;
	term_limit_years: number;
	default_allowance: number;
	current_allowance: number;
	allowance_modification_reason: string | null;
	current_person_id: string | null;
	given_name: string | null;
	surname: string | null;
	handle: string | null;
}

export interface PositionPayrollCandidateRow {
	id: string;
	name: string;
	current_allowance: number;
	current_person_id: string;
	given_name: string;
	surname: string;
}

export interface PositionAllowanceUpdateParams {
	positionId: string;
	newAllowance: number;
	reason: string | null;
}

export class PositionRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async findById(id: string): Promise<PositionDetailRow | null> {
		const [row] = await this.sql<PositionDetailRow[]>`
			SELECT
				pos.id, pos.unit_id, u.name AS unit_name,
				pos.name, pos.is_unit_leader, pos.description, pos.term_limit_years,
				pos.current_person_id, p.given_name, p.surname, p.handle,
				pos.appointed_at, pos.term_expires_at,
				pos.default_allowance, pos.current_allowance, pos.allowance_modification_reason
			FROM position pos
			JOIN unit u ON u.id = pos.unit_id
			LEFT JOIN person p ON p.id = pos.current_person_id
			WHERE pos.id = ${id}`;
		return row ?? null;
	}

	async nameExistsInUnit(unitId: string, name: string): Promise<boolean> {
		const [row] = await this.sql`SELECT id FROM position WHERE unit_id = ${unitId} AND name = ${name}`;
		return !!row;
	}

	async create(params: {
		id: string;
		unitId: string;
		name: string;
		isUnitLeader: boolean;
		description: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO position (id, unit_id, name, is_unit_leader, description, term_limit_years, default_allowance, current_allowance)
			VALUES (${params.id}, ${params.unitId}, ${params.name}, ${params.isUnitLeader}, ${params.description}, ${params.termLimitYears}, ${params.defaultAllowance}, ${params.defaultAllowance})`;
	}

	async update(id: string, params: {
		name: string;
		isUnitLeader: boolean;
		description: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): Promise<void> {
		await this.sql`
			UPDATE position
			SET name = ${params.name}, is_unit_leader = ${params.isUnitLeader},
			    description = ${params.description}, term_limit_years = ${params.termLimitYears},
			    default_allowance = ${params.defaultAllowance}
			WHERE id = ${id}`;
	}

	async delete(id: string): Promise<void> {
		await this.sql`DELETE FROM position WHERE id = ${id}`;
	}

	async assign(id: string, personId: string, appointedAt: string, expiresAt: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = ${personId}, appointed_at = ${appointedAt}, term_expires_at = ${expiresAt}
			WHERE id = ${id}`;
	}

	async clearAppointment(id: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
			WHERE id = ${id}`;
	}

	async clearAppointmentsForPerson(personId: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
			WHERE current_person_id = ${personId}`;
	}

	async isPersonOfficer(personId: string): Promise<boolean> {
		const [row] = await this.sql`SELECT id FROM position WHERE current_person_id = ${personId} LIMIT 1`;
		return !!row;
	}

	async listEligibleMembers(societyId: string): Promise<EligibleMemberRow[]> {
		return this.sql<EligibleMemberRow[]>`
			SELECT p.id, p.given_name, p.surname, p.handle
			FROM person p
			WHERE p.society_id = ${societyId}
			  AND p.membership_status != 'deleted'
			  AND p.id NOT IN (
				SELECT gam.person_id
				FROM general_assembly_member gam
				JOIN general_assembly ga ON ga.id = gam.assembly_id
				WHERE ga.society_id = ${societyId} AND ga.status = 'current'
			  )
			ORDER BY p.surname, p.given_name`;
	}

	async listForPayroll(): Promise<PositionPayrollRow[]> {
		return this.sql<PositionPayrollRow[]>`
			SELECT pos.id, u.name AS unit_name, pos.name, pos.description, pos.term_limit_years,
			       pos.default_allowance, pos.current_allowance, pos.allowance_modification_reason,
			       pos.current_person_id, p.given_name, p.surname, p.handle
			FROM position pos
			JOIN unit u ON u.id = pos.unit_id
			LEFT JOIN person p ON p.id = pos.current_person_id
			ORDER BY u.name, pos.is_unit_leader DESC, pos.name`;
	}

	async listPayrollCandidates(): Promise<PositionPayrollCandidateRow[]> {
		return this.sql<PositionPayrollCandidateRow[]>`
			SELECT pos.id, pos.name, pos.current_allowance, pos.current_person_id,
			       p.given_name, p.surname
			FROM position pos
			JOIN person p ON p.id = pos.current_person_id
			WHERE pos.current_person_id IS NOT NULL
			  AND pos.current_allowance > 0
			  AND p.membership_status != 'deleted'
			ORDER BY pos.name`;
	}

	async updateAllowance(params: PositionAllowanceUpdateParams): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_allowance = ${params.newAllowance}, allowance_modification_reason = ${params.reason}
			WHERE id = ${params.positionId}`;
	}

	async listCurrentPermissions(positionId: string): Promise<PermissionRow[]> {
		return this.sql<PermissionRow[]>`
			SELECT p.id, p.code, p.name, p.category
			FROM permission p
			JOIN position_permission pp ON pp.permission_id = p.id
			WHERE pp.position_id = ${positionId}
			ORDER BY p.category, p.name`;
	}

	async listAllPermissions(): Promise<PermissionRow[]> {
		return this.sql<PermissionRow[]>`SELECT id, code, name, category FROM permission ORDER BY category, name`;
	}

	async grantPermission(positionId: string, permissionId: string): Promise<void> {
		await this.sql`
			INSERT INTO position_permission (position_id, permission_id)
			VALUES (${positionId}, ${permissionId})
			ON CONFLICT DO NOTHING`;
	}

	async revokePermission(positionId: string, permissionId: string): Promise<void> {
		await this.sql`
			DELETE FROM position_permission
			WHERE position_id = ${positionId} AND permission_id = ${permissionId}`;
	}
}
