import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	listBySociety(societyId: string): EventRow[] {
		return this.database
			.prepare(
				`SELECT
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
				 WHERE e.society_id = ?
				 ORDER BY e.starts_at DESC`
			)
			.all(societyId) as EventRow[];
	}

	listAssociations(societyId: string): EventAssociationRow[] {
		return this.database
			.prepare('SELECT id, name FROM association WHERE society_id = ? ORDER BY name')
			.all(societyId) as EventAssociationRow[];
	}

	createEvent(params: {
		eventId: string;
		societyId: string;
		associationId: string | null;
		title: string;
		description: string | null;
		location: string | null;
		startsAt: string;
		endsAt: string | null;
		createdBy: string;
	}): void {
		this.database
			.prepare(
				`INSERT INTO event (id, society_id, association_id, title, description, location, starts_at, ends_at, created_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.eventId,
				params.societyId,
				params.associationId,
				params.title,
				params.description,
				params.location,
				params.startsAt,
				params.endsAt,
				params.createdBy
			);
	}
}