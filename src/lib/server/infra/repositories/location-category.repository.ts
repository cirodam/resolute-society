import type postgres from 'postgres';

export interface LocationCategoryRow {
	id: string;
	society_id: string;
	name: string;
	color: string;
	created_at: string;
}

export class LocationCategoryRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listBySociety(societyId: string): Promise<LocationCategoryRow[]> {
		return await this.sql<LocationCategoryRow[]>`
			SELECT id, society_id, name, color, created_at
			FROM location_category
			WHERE society_id = ${societyId}
			ORDER BY name`;
	}

	async findById(id: string): Promise<LocationCategoryRow | null> {
		const [row] = await this.sql<LocationCategoryRow[]>`
			SELECT id, society_id, name, color, created_at FROM location_category WHERE id = ${id}`;
		return row ?? null;
	}

	async create(params: { id: string; societyId: string; name: string; color: string }): Promise<void> {
		await this.sql`
			INSERT INTO location_category (id, society_id, name, color) VALUES (${params.id}, ${params.societyId}, ${params.name}, ${params.color})`;
	}

	async update(params: { id: string; name: string; color: string }): Promise<void> {
		await this.sql`UPDATE location_category SET name = ${params.name}, color = ${params.color} WHERE id = ${params.id}`;
	}

	async delete(id: string): Promise<void> {
		await this.sql`DELETE FROM location_category WHERE id = ${id}`;
	}
}
