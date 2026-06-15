import type postgres from 'postgres';

export interface UnitRow {
	id: string;
	parent_unit_id: string | null;
	name: string;
	description: string | null;
	created_at: Date;
	leader_position_id: string | null;
	leader_position_name: string | null;
	leader_person_id: string | null;
	leader_given_name: string | null;
	leader_surname: string | null;
	leader_handle: string | null;
	position_count: number;
	sub_unit_count: number;
}

export interface UnitDetailRow {
	id: string;
	parent_unit_id: string | null;
	name: string;
	description: string | null;
	created_at: Date;
}

export interface UnitPositionRow {
	id: string;
	unit_id: string;
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

const UNIT_SUMMARY_SQL = (whereClause: string) => `
	SELECT
		u.id, u.parent_unit_id, u.name, u.description, u.created_at,
		lp.id               AS leader_position_id,
		lp.name             AS leader_position_name,
		lp.current_person_id AS leader_person_id,
		p.given_name        AS leader_given_name,
		p.surname           AS leader_surname,
		p.handle            AS leader_handle,
		(SELECT COUNT(*)::int FROM position WHERE unit_id = u.id)        AS position_count,
		(SELECT COUNT(*)::int FROM unit child WHERE child.parent_unit_id = u.id) AS sub_unit_count
	FROM unit u
	LEFT JOIN position lp ON lp.unit_id = u.id AND lp.is_unit_leader = TRUE
	LEFT JOIN person p ON p.id = lp.current_person_id
	${whereClause}
	ORDER BY u.name
`;

export class UnitRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listRoots(): Promise<UnitRow[]> {
		return this.sql.unsafe<UnitRow[]>(
			UNIT_SUMMARY_SQL('WHERE u.parent_unit_id IS NULL')
		);
	}

	async listSubUnits(parentId: string): Promise<UnitRow[]> {
		return this.sql<UnitRow[]>`
			SELECT
				u.id, u.parent_unit_id, u.name, u.description, u.created_at,
				lp.id               AS leader_position_id,
				lp.name             AS leader_position_name,
				lp.current_person_id AS leader_person_id,
				p.given_name        AS leader_given_name,
				p.surname           AS leader_surname,
				p.handle            AS leader_handle,
				(SELECT COUNT(*)::int FROM position WHERE unit_id = u.id)        AS position_count,
				(SELECT COUNT(*)::int FROM unit child WHERE child.parent_unit_id = u.id) AS sub_unit_count
			FROM unit u
			LEFT JOIN position lp ON lp.unit_id = u.id AND lp.is_unit_leader = TRUE
			LEFT JOIN person p ON p.id = lp.current_person_id
			WHERE u.parent_unit_id = ${parentId}
			ORDER BY u.name`;
	}

	async findById(id: string): Promise<UnitDetailRow | null> {
		const [row] = await this.sql<UnitDetailRow[]>`
			SELECT id, parent_unit_id, name, description, created_at
			FROM unit WHERE id = ${id}`;
		return row ?? null;
	}

	async findSummaryById(id: string): Promise<UnitRow | null> {
		const [row] = await this.sql<UnitRow[]>`
			SELECT
				u.id, u.parent_unit_id, u.name, u.description, u.created_at,
				lp.id               AS leader_position_id,
				lp.name             AS leader_position_name,
				lp.current_person_id AS leader_person_id,
				p.given_name        AS leader_given_name,
				p.surname           AS leader_surname,
				p.handle            AS leader_handle,
				(SELECT COUNT(*)::int FROM position WHERE unit_id = u.id)        AS position_count,
				(SELECT COUNT(*)::int FROM unit child WHERE child.parent_unit_id = u.id) AS sub_unit_count
			FROM unit u
			LEFT JOIN position lp ON lp.unit_id = u.id AND lp.is_unit_leader = TRUE
			LEFT JOIN person p ON p.id = lp.current_person_id
			WHERE u.id = ${id}`;
		return row ?? null;
	}

	async listPositions(unitId: string): Promise<UnitPositionRow[]> {
		return this.sql<UnitPositionRow[]>`
			SELECT
				pos.id, pos.unit_id, pos.name, pos.is_unit_leader, pos.description,
				pos.term_limit_years, pos.current_person_id,
				p.given_name, p.surname, p.handle,
				pos.appointed_at, pos.term_expires_at,
				pos.default_allowance, pos.current_allowance, pos.allowance_modification_reason
			FROM position pos
			LEFT JOIN person p ON p.id = pos.current_person_id
			WHERE pos.unit_id = ${unitId}
			ORDER BY pos.is_unit_leader DESC, pos.name`;
	}

	async nameExists(name: string): Promise<boolean> {
		const [row] = await this.sql`SELECT id FROM unit WHERE name = ${name}`;
		return !!row;
	}

	async create(params: {
		id: string;
		name: string;
		description: string | null;
		parentUnitId: string | null;
	}): Promise<void> {
		await this.sql`
			INSERT INTO unit (id, parent_unit_id, name, description)
			VALUES (${params.id}, ${params.parentUnitId}, ${params.name}, ${params.description})`;
	}

	async update(id: string, params: { name: string; description: string | null }): Promise<void> {
		await this.sql`
			UPDATE unit SET name = ${params.name}, description = ${params.description}
			WHERE id = ${id}`;
	}

	async delete(id: string): Promise<void> {
		await this.sql`DELETE FROM unit WHERE id = ${id}`;
	}

	async hasSubUnits(id: string): Promise<boolean> {
		const [row] = await this.sql`SELECT id FROM unit WHERE parent_unit_id = ${id} LIMIT 1`;
		return !!row;
	}

	async hasPositions(id: string): Promise<boolean> {
		const [row] = await this.sql`SELECT id FROM position WHERE unit_id = ${id} LIMIT 1`;
		return !!row;
	}
}
