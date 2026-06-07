import type postgres from 'postgres';

export interface OfficerPositionRow {
	position_id: string;
	name: string;
	description: string | null;
	term_limit_years: number;
	current_person_id: string | null;
	given_name: string | null;
	surname: string | null;
}

export interface PositionDetailRow {
	id: string;
	name: string;
	description: string | null;
	term_limit_years: number;
	type: string;
	section: string | null;
	parent_position_id: string | null;
	current_person_id: string | null;
	appointed_at: string | null;
	term_expires_at: string | null;
	given_name: string | null;
	surname: string | null;
	handle: string | null;
}

export interface SubordinateRow {
	id: string;
	name: string;
	description: string | null;
	type: string;
	section: string | null;
	current_person_id: string | null;
	appointed_at: string | null;
	term_expires_at: string | null;
	given_name: string | null;
	surname: string | null;
	handle: string | null;
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

export interface ParentPositionRow {
	type: string;
	society_id: string;
}

export interface PositionTermRow {
	term_limit_years: number;
}

export interface PositionPayrollRow {
	id: string;
	name: string;
	type: string;
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
	societyId: string;
}

export class PositionRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async findSociety(societyId: string): Promise<{ id: string; name: string } | null> {
		const [row] = await this.sql<Array<{ id: string; name: string }>>`SELECT id, name FROM society_config WHERE id = ${societyId}`;
		return row ?? null;
	}

	async listOfficerPositions(societyId: string): Promise<OfficerPositionRow[]> {
		return await this.sql<OfficerPositionRow[]>`
			SELECT op.id as position_id, op.name, op.description, op.term_limit_years,
			       op.current_person_id,
			       p.given_name, p.surname
			FROM position op
			LEFT JOIN person p ON p.id = op.current_person_id
			WHERE op.society_id = ${societyId} AND op.type = 'officer'
			ORDER BY op.name`;
	}

	async findPositionDetail(positionId: string, societyId: string): Promise<PositionDetailRow | null> {
		const [row] = await this.sql<PositionDetailRow[]>`
			SELECT op.id, op.name, op.description, op.term_limit_years, op.type, op.section,
			       op.parent_position_id, op.current_person_id, op.appointed_at, op.term_expires_at,
			       p.given_name, p.surname, p.handle
			FROM position op
			LEFT JOIN person p ON p.id = op.current_person_id
			WHERE op.id = ${positionId} AND op.society_id = ${societyId}`;
		return row ?? null;
	}

	async listSubordinates(positionId: string): Promise<SubordinateRow[]> {
		return await this.sql<SubordinateRow[]>`
			SELECT op.id, op.name, op.description, op.type, op.section,
			       op.current_person_id, op.appointed_at, op.term_expires_at,
			       p.given_name, p.surname, p.handle
			FROM position op
			LEFT JOIN person p ON p.id = op.current_person_id
			WHERE op.parent_position_id = ${positionId}
			ORDER BY op.name`;
	}

	async listEligibleMembers(societyId: string): Promise<EligibleMemberRow[]> {
		return await this.sql<EligibleMemberRow[]>`
			SELECT p.id, p.given_name, p.surname, p.handle
			FROM person p
			WHERE p.society_id = ${societyId}
			AND p.id NOT IN (
			  SELECT gam.person_id
			  FROM general_assembly_member gam
			  JOIN general_assembly ga ON ga.id = gam.assembly_id
			  WHERE ga.society_id = ${societyId} AND ga.status = 'current'
			)
			ORDER BY p.surname, p.given_name`;
	}

	async listCurrentPermissions(positionId: string): Promise<PermissionRow[]> {
		return await this.sql<PermissionRow[]>`
			SELECT p.id, p.code, p.name, p.category
			FROM permission p
			JOIN position_permission pp ON pp.permission_id = p.id
			WHERE pp.position_id = ${positionId}
			ORDER BY p.category, p.name`;
	}

	async listAllPermissions(): Promise<PermissionRow[]> {
		return await this.sql<PermissionRow[]>`SELECT id, code, name, category FROM permission ORDER BY category, name`;
	}

	async isPersonInCurrentAssembly(personId: string, societyId: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM general_assembly_member gam
			JOIN general_assembly ga ON ga.id = gam.assembly_id
			WHERE gam.person_id = ${personId} AND ga.society_id = ${societyId} AND ga.status = 'current'`;
		return !!existing;
	}

	async isPersonOfficer(personId: string, societyId: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM position WHERE current_person_id = ${personId} AND society_id = ${societyId}`;
		return !!existing;
	}

	async findPositionTerm(positionId: string): Promise<PositionTermRow | null> {
		const [row] = await this.sql<PositionTermRow[]>`SELECT term_limit_years FROM position WHERE id = ${positionId}`;
		return row ?? null;
	}

	async findParentPosition(positionId: string): Promise<ParentPositionRow | null> {
		const [row] = await this.sql<ParentPositionRow[]>`SELECT type, society_id FROM position WHERE id = ${positionId}`;
		return row ?? null;
	}

	async positionExistsInSociety(societyId: string, name: string): Promise<boolean> {
		const [existing] = await this.sql`SELECT id FROM position WHERE society_id = ${societyId} AND name = ${name}`;
		return !!existing;
	}

	async createOfficerPosition(params: {
		societyId: string;
		positionId: string;
		name: string;
		description: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO position (id, society_id, parent_position_id, type, name, description, term_limit_years, default_allowance, current_allowance)
			VALUES (${params.positionId}, ${params.societyId}, ${null}, ${'officer'}, ${params.name}, ${params.description}, ${params.termLimitYears}, ${params.defaultAllowance}, ${params.defaultAllowance})`;
	}

	async assignPerson(positionId: string, personId: string, appointedAt: string, expiresAt: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = ${personId}, appointed_at = ${appointedAt}, term_expires_at = ${expiresAt}
			WHERE id = ${positionId}`;
	}

	async clearAppointment(positionId: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
			WHERE id = ${positionId}`;
	}

	async clearAppointmentsForPerson(personId: string): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
			WHERE current_person_id = ${personId}`;
	}

	async createSubordinatePosition(params: {
		societyId: string;
		parentPositionId: string;
		childType: 'section_chief' | 'line_worker';
		positionId: string;
		name: string;
		description: string | null;
		section: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO position (id, society_id, parent_position_id, type, name, description, section, term_limit_years, default_allowance, current_allowance)
			VALUES (${params.positionId}, ${params.societyId}, ${params.parentPositionId}, ${params.childType}, ${params.name}, ${params.description}, ${params.section}, ${params.termLimitYears}, ${params.defaultAllowance}, ${params.defaultAllowance})`;
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

	async listForPerson(personId: string): Promise<Array<{ id: string; name: string; type: string; current_allowance: number }>> {
		return await this.sql<Array<{ id: string; name: string; type: string; current_allowance: number }>>`
			SELECT id, name, type, current_allowance
			FROM position WHERE current_person_id = ${personId}
			ORDER BY type, name`;
	}

	async findPositionSociety(positionId: string): Promise<{ society_id: string } | null> {
		const [row] = await this.sql<Array<{ society_id: string }>>`SELECT society_id FROM position WHERE id = ${positionId}`;
		return row ?? null;
	}

	async listForPayroll(societyId: string): Promise<PositionPayrollRow[]> {
		return await this.sql<PositionPayrollRow[]>`
			SELECT p.id, p.name, p.type, p.default_allowance, p.current_allowance,
			       p.allowance_modification_reason, p.current_person_id,
			       person.given_name, person.surname, person.handle
			FROM position p
			LEFT JOIN person ON person.id = p.current_person_id
			WHERE p.society_id = ${societyId}
			ORDER BY p.type, p.name`;
	}

	async listPayrollCandidates(societyId: string): Promise<PositionPayrollCandidateRow[]> {
		return await this.sql<PositionPayrollCandidateRow[]>`
			SELECT p.id, p.name, p.current_allowance, p.current_person_id,
			       person.given_name, person.surname
			FROM position p
			JOIN person ON person.id = p.current_person_id
			WHERE p.society_id = ${societyId} AND p.current_person_id IS NOT NULL AND p.current_allowance > 0
			  AND person.membership_status != 'deleted'
			ORDER BY p.type, p.name`;
	}

	async updateAllowance(params: PositionAllowanceUpdateParams): Promise<void> {
		await this.sql`
			UPDATE position
			SET current_allowance = ${params.newAllowance}, allowance_modification_reason = ${params.reason}
			WHERE id = ${params.positionId} AND society_id = ${params.societyId}`;
	}
}
