import type postgres from 'postgres';

export interface EventRow {
	id: string;
	title: string;
	description: string | null;
	location: string | null;
	starts_at: string;
	ends_at: string | null;
	created_at: string;
	creator_given_name: string;
	creator_surname: string;
	association_name: string | null;
}

export interface EventAssociationRow {
	id: string;
	name: string;
}

export class EventRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listBySociety(societyId: string): Promise<EventRow[]> {
		return await this.sql<EventRow[]>`
			SELECT
				e.id,
				e.title,
				e.description,
				e.location,
				e.starts_at,
				e.ends_at,
				e.created_at,
				p.given_name as creator_given_name,
				p.surname as creator_surname,
				a.name as association_name
			FROM event e
			LEFT JOIN person p ON e.created_by = p.id
			LEFT JOIN association a ON e.association_id = a.id
			WHERE e.society_id = ${societyId}
			ORDER BY e.starts_at DESC`;
	}

	async listByMonth(societyId: string, year: number, month: number): Promise<EventRow[]> {
		const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
		const end = new Date(year, month, 1).toISOString().slice(0, 10);
		return await this.sql<EventRow[]>`
			SELECT
				e.id,
				e.title,
				e.description,
				e.location,
				e.starts_at,
				e.ends_at,
				e.created_at,
				p.given_name as creator_given_name,
				p.surname as creator_surname,
				a.name as association_name
			FROM event e
			LEFT JOIN person p ON e.created_by = p.id
			LEFT JOIN association a ON e.association_id = a.id
			WHERE e.society_id = ${societyId}
			  AND e.starts_at >= ${start}
			  AND e.starts_at < ${end}
			ORDER BY e.starts_at ASC`;
	}

	async listAssociations(societyId: string): Promise<EventAssociationRow[]> {
		return await this.sql<EventAssociationRow[]>`
			SELECT id, name FROM association WHERE society_id = ${societyId} ORDER BY name`;
	}

	async createEvent(params: {
		eventId: string;
		societyId: string;
		associationId: string | null;
		title: string;
		description: string | null;
		location: string | null;
		startsAt: string;
		endsAt: string | null;
		createdBy: string;
	}): Promise<void> {
		await this.sql`
			INSERT INTO event (id, society_id, association_id, title, description, location, starts_at, ends_at, created_by)
			VALUES (${params.eventId}, ${params.societyId}, ${params.associationId}, ${params.title}, ${params.description}, ${params.location}, ${params.startsAt}, ${params.endsAt}, ${params.createdBy})`;
	}
}
