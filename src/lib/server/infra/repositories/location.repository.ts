import type postgres from 'postgres';

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
	constructor(private readonly sql: postgres.Sql) {}

	async listBySociety(societyId: string): Promise<LocationRow[]> {
		const rows = await this.sql<LocationDbRow[]>`
			${this.sql.unsafe(SELECT)} WHERE l.society_id = ${societyId} ORDER BY c.name, l.name`;
		return rows.map(mapRow);
	}

	async findById(id: string): Promise<LocationRow | null> {
		const [row] = await this.sql<LocationDbRow[]>`${this.sql.unsafe(SELECT)} WHERE l.id = ${id}`;
		return row ? mapRow(row) : null;
	}

	async create(params: {
		id: string;
		societyId: string;
		name: string;
		categoryId: string | null;
		address: string | null;
		lat: number;
		lng: number;
		notes: string | null;
	}): Promise<void> {
		await this.sql`
			INSERT INTO location (id, society_id, name, category_id, address, lat, lng, notes)
			VALUES (${params.id}, ${params.societyId}, ${params.name}, ${params.categoryId}, ${params.address}, ${params.lat}, ${params.lng}, ${params.notes})`;
	}

	async update(params: {
		id: string;
		name: string;
		categoryId: string | null;
		address: string | null;
		lat: number;
		lng: number;
		notes: string | null;
	}): Promise<void> {
		await this.sql`
			UPDATE location
			SET name = ${params.name}, category_id = ${params.categoryId}, address = ${params.address}, lat = ${params.lat}, lng = ${params.lng}, notes = ${params.notes}
			WHERE id = ${params.id}`;
	}

	async delete(id: string): Promise<void> {
		await this.sql`DELETE FROM location WHERE id = ${id}`;
	}
}
