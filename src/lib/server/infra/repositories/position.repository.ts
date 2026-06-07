import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	findSociety(societyId: string): { id: string; name: string } | null {
		const society = this.database
			.prepare('SELECT id, name FROM society_config WHERE id = ?')
			.get(societyId) as { id: string; name: string } | undefined;

		return society ?? null;
	}

	listOfficerPositions(societyId: string): OfficerPositionRow[] {
		return this.database
			.prepare(
				`SELECT op.id as position_id, op.name, op.description, op.term_limit_years,
				        op.current_person_id,
				        p.given_name, p.surname
				 FROM position op
				 LEFT JOIN person p ON p.id = op.current_person_id
				 WHERE op.society_id = ? AND op.type = 'officer'
				 ORDER BY op.name`
			)
			.all(societyId) as OfficerPositionRow[];
	}

	findPositionDetail(positionId: string, societyId: string): PositionDetailRow | null {
		const position = this.database
			.prepare(
				`SELECT op.id, op.name, op.description, op.term_limit_years, op.type, op.section,
				        op.parent_position_id, op.current_person_id, op.appointed_at, op.term_expires_at,
				        p.given_name, p.surname, p.handle
				 FROM position op
				 LEFT JOIN person p ON p.id = op.current_person_id
				 WHERE op.id = ? AND op.society_id = ?`
			)
			.get(positionId, societyId) as PositionDetailRow | undefined;

		return position ?? null;
	}

	listSubordinates(positionId: string): SubordinateRow[] {
		return this.database
			.prepare(
				`SELECT op.id, op.name, op.description, op.type, op.section,
				        op.current_person_id, op.appointed_at, op.term_expires_at,
				        p.given_name, p.surname, p.handle
				 FROM position op
				 LEFT JOIN person p ON p.id = op.current_person_id
				 WHERE op.parent_position_id = ?
				 ORDER BY op.name`
			)
			.all(positionId) as SubordinateRow[];
	}

	listEligibleMembers(societyId: string): EligibleMemberRow[] {
		return this.database
			.prepare(
				`SELECT p.id, p.given_name, p.surname, p.handle
				 FROM person p
				 WHERE p.society_id = ?
				 AND p.id NOT IN (
				   SELECT gam.person_id
				   FROM general_assembly_member gam
				   JOIN general_assembly ga ON ga.id = gam.assembly_id
				   WHERE ga.society_id = ? AND ga.status = 'current'
				 )
				 ORDER BY p.surname, p.given_name`
			)
			.all(societyId, societyId) as EligibleMemberRow[];
	}

	listCurrentPermissions(positionId: string): PermissionRow[] {
		return this.database
			.prepare(
				`SELECT p.id, p.code, p.name, p.category
				 FROM permission p
				 JOIN position_permission pp ON pp.permission_id = p.id
				 WHERE pp.position_id = ?
				 ORDER BY p.category, p.name`
			)
			.all(positionId) as PermissionRow[];
	}

	listAllPermissions(): PermissionRow[] {
		return this.database
			.prepare('SELECT id, code, name, category FROM permission ORDER BY category, name')
			.all() as PermissionRow[];
	}

	isPersonInCurrentAssembly(personId: string, societyId: string): boolean {
		const existing = this.database
			.prepare(
				`SELECT 1 FROM general_assembly_member gam
				 JOIN general_assembly ga ON ga.id = gam.assembly_id
				 WHERE gam.person_id = ? AND ga.society_id = ? AND ga.status = 'current'`
			)
			.get(personId, societyId);

		return !!existing;
	}

	isPersonOfficer(personId: string, societyId: string): boolean {
		const existing = this.database
			.prepare('SELECT 1 FROM position WHERE current_person_id = ? AND society_id = ?')
			.get(personId, societyId);

		return !!existing;
	}

	findPositionTerm(positionId: string): PositionTermRow | null {
		const position = this.database
			.prepare('SELECT term_limit_years FROM position WHERE id = ?')
			.get(positionId) as PositionTermRow | undefined;

		return position ?? null;
	}

	findParentPosition(positionId: string): ParentPositionRow | null {
		const parent = this.database
			.prepare('SELECT type, society_id FROM position WHERE id = ?')
			.get(positionId) as ParentPositionRow | undefined;

		return parent ?? null;
	}

	positionExistsInSociety(societyId: string, name: string): boolean {
		const existing = this.database
			.prepare('SELECT id FROM position WHERE society_id = ? AND name = ?')
			.get(societyId, name);

		return !!existing;
	}

	createOfficerPosition(params: {
		societyId: string;
		positionId: string;
		name: string;
		description: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): void {
		this.database
			.prepare(
				`INSERT INTO position (id, society_id, parent_position_id, type, name, description, term_limit_years, default_allowance, current_allowance)
				 VALUES (?, ?, NULL, 'officer', ?, ?, ?, ?, ?)`
			)
			.run(
				params.positionId,
				params.societyId,
				params.name,
				params.description,
				params.termLimitYears,
				params.defaultAllowance,
				params.defaultAllowance
			);
	}

	assignPerson(positionId: string, personId: string, appointedAt: string, expiresAt: string): void {
		this.database
			.prepare(
				`UPDATE position
				 SET current_person_id = ?, appointed_at = ?, term_expires_at = ?
				 WHERE id = ?`
			)
			.run(personId, appointedAt, expiresAt, positionId);
	}

	clearAppointment(positionId: string): void {
		this.database
			.prepare(
				`UPDATE position
				 SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
				 WHERE id = ?`
			)
			.run(positionId);
	}

	clearAppointmentsForPerson(personId: string): void {
		this.database
			.prepare(
				`UPDATE position
				 SET current_person_id = NULL, appointed_at = NULL, term_expires_at = NULL
				 WHERE current_person_id = ?`
			)
			.run(personId);
	}

	createSubordinatePosition(params: {
		societyId: string;
		parentPositionId: string;
		childType: 'section_chief' | 'line_worker';
		positionId: string;
		name: string;
		description: string | null;
		section: string | null;
		termLimitYears: number;
		defaultAllowance: number;
	}): void {
		this.database
			.prepare(
				`INSERT INTO position (id, society_id, parent_position_id, type, name, description, section, term_limit_years, default_allowance, current_allowance)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.positionId,
				params.societyId,
				params.parentPositionId,
				params.childType,
				params.name,
				params.description,
				params.section,
				params.termLimitYears,
				params.defaultAllowance,
				params.defaultAllowance
			);
	}

	grantPermission(positionId: string, permissionId: string): void {
		this.database
			.prepare(
				`INSERT OR IGNORE INTO position_permission (position_id, permission_id)
				 VALUES (?, ?)`
			)
			.run(positionId, permissionId);
	}

	revokePermission(positionId: string, permissionId: string): void {
		this.database
			.prepare(
				`DELETE FROM position_permission
				 WHERE position_id = ? AND permission_id = ?`
			)
			.run(positionId, permissionId);
	}

	listForPerson(personId: string): Array<{ id: string; name: string; type: string; current_allowance: number }> {
		return this.database
			.prepare(
				`SELECT id, name, type, current_allowance
				 FROM position WHERE current_person_id = ?
				 ORDER BY type, name`
			)
			.all(personId) as Array<{ id: string; name: string; type: string; current_allowance: number }>;
	}

	findPositionSociety(positionId: string): { society_id: string } | null {
		const position = this.database
			.prepare('SELECT society_id FROM position WHERE id = ?')
			.get(positionId) as { society_id: string } | undefined;

		return position ?? null;
	}

	listForPayroll(societyId: string): PositionPayrollRow[] {
		return this.database
			.prepare(
				`SELECT p.id, p.name, p.type, p.default_allowance, p.current_allowance,
				        p.allowance_modification_reason, p.current_person_id,
				        person.given_name, person.surname, person.handle
				 FROM position p
				 LEFT JOIN person ON person.id = p.current_person_id
				 WHERE p.society_id = ?
				 ORDER BY p.type, p.name`
			)
			.all(societyId) as PositionPayrollRow[];
	}

	listPayrollCandidates(societyId: string): PositionPayrollCandidateRow[] {
		return this.database
			.prepare(
				`SELECT p.id, p.name, p.current_allowance, p.current_person_id,
				        person.given_name, person.surname
				 FROM position p
				 JOIN person ON person.id = p.current_person_id
				 WHERE p.society_id = ? AND p.current_person_id IS NOT NULL AND p.current_allowance > 0
				   AND person.membership_status != 'deleted'
				 ORDER BY p.type, p.name`
			)
			.all(societyId) as PositionPayrollCandidateRow[];
	}

	updateAllowance(params: PositionAllowanceUpdateParams): void {
		this.database
			.prepare(
				`UPDATE position
				 SET current_allowance = ?, allowance_modification_reason = ?
				 WHERE id = ? AND society_id = ?`
			)
			.run(params.newAllowance, params.reason, params.positionId, params.societyId);
	}
}
