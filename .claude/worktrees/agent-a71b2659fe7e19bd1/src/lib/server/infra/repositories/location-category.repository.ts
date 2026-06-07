import type Database from 'better-sqlite3';

export interface LocationCategoryRow {
	id: string;
	society_id: string;
	name: string;
	color: string;
	created_at: string;
}

export class LocationCategoryRepository {
	constructor(private readonly database: Database.Database) {}

	listBySociety(societyId: string): LocationCategoryRow[] {
		return this.database
			.prepare(
				`SELECT id, society_id, name, color, created_at
				 FROM location_category
				 WHERE society_id = ?
				 ORDER BY name`
			)
			.all(societyId) as LocationCategoryRow[];
	}

	findById(id: string): LocationCategoryRow | null {
		return (
			(this.database
				.prepare(`SELECT id, society_id, name, color, created_at FROM location_category WHERE id = ?`)
				.get(id) as LocationCategoryRow | undefined) ?? null
		);
	}

	create(params: { id: string; societyId: string; name: string; color: string }): void {
		this.database
			.prepare(`INSERT INTO location_category (id, society_id, name, color) VALUES (?, ?, ?, ?)`)
			.run(params.id, params.societyId, params.name, params.color);
	}

	update(params: { id: string; name: string; color: string }): void {
		this.database
			.prepare(`UPDATE location_category SET name = ?, color = ? WHERE id = ?`)
			.run(params.name, params.color, params.id);
	}

	delete(id: string): void {
		this.database.prepare(`DELETE FROM location_category WHERE id = ?`).run(id);
	}
}
