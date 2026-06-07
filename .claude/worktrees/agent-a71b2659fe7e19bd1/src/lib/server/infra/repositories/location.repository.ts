import type Database from 'better-sqlite3';

export interface LocationCategory {
	id: string;
	name: string;
	color: string;
}

export interface LocationRow {
	id: string;
	society_id: string;
	name: string;
	category: LocationCategory | null;
	address: string | null;
	lat: number;
	lng: number;
	notes: string | null;
	created_at: string;
}

interface LocationDbRow {
	id: string;
	society_id: string;
	name: string;
	category_id: string | null;
	category_name: string | null;
	category_color: string | null;
	address: string | null;
	lat: number;
	lng: number;
	notes: string | null;
	created_at: string;
}

function mapRow(row: LocationDbRow): LocationRow {
	return {
		...row,
		category:
			row.category_id && row.category_name && row.category_color
				? { id: row.category_id, name: row.category_name, color: row.category_color }
				: null
	};
}

const SELECT = `
	SELECT
		l.id, l.society_id, l.name, l.address, l.lat, l.lng, l.notes, l.created_at,
		c.id   AS category_id,
		c.name AS category_name,
		c.color AS category_color
	FROM location l
	LEFT JOIN location_category c ON l.category_id = c.id
`;

export class LocationRepository {
	constructor(private readonly database: Database.Database) {}

	listBySociety(societyId: string): LocationRow[] {
		return (
			this.database
				.prepare(`${SELECT} WHERE l.society_id = ? ORDER BY c.name, l.name`)
				.all(societyId) as LocationDbRow[]
		).map(mapRow);
	}

	findById(id: string): LocationRow | null {
		const row = this.database
			.prepare(`${SELECT} WHERE l.id = ?`)
			.get(id) as LocationDbRow | undefined;
		return row ? mapRow(row) : null;
	}

	create(params: {
		id: string;
		societyId: string;
		name: string;
		categoryId: string | null;
		address: string | null;
		lat: number;
		lng: number;
		notes: string | null;
	}): void {
		this.database
			.prepare(
				`INSERT INTO location (id, society_id, name, category_id, address, lat, lng, notes)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.id,
				params.societyId,
				params.name,
				params.categoryId,
				params.address,
				params.lat,
				params.lng,
				params.notes
			);
	}

	update(params: {
		id: string;
		name: string;
		categoryId: string | null;
		address: string | null;
		lat: number;
		lng: number;
		notes: string | null;
	}): void {
		this.database
			.prepare(
				`UPDATE location
				 SET name = ?, category_id = ?, address = ?, lat = ?, lng = ?, notes = ?
				 WHERE id = ?`
			)
			.run(
				params.name,
				params.categoryId,
				params.address,
				params.lat,
				params.lng,
				params.notes,
				params.id
			);
	}

	delete(id: string): void {
		this.database.prepare('DELETE FROM location WHERE id = ?').run(id);
	}
}
