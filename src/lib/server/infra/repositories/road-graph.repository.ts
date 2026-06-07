import type postgres from 'postgres';

export interface RoadNodeRow {
	id: string;
	society_id: string;
	lat: number;
	lng: number;
	label: string | null;
	created_at: string;
}

export interface RoadEdgeRow {
	id: string;
	society_id: string;
	node_a_id: string;
	node_b_id: string;
	distance_km: number;
	created_at: string;
}

export class RoadGraphRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listNodesBySociety(societyId: string): Promise<RoadNodeRow[]> {
		return await this.sql<RoadNodeRow[]>`SELECT * FROM road_node WHERE society_id = ${societyId} ORDER BY created_at`;
	}

	async listEdgesBySociety(societyId: string): Promise<RoadEdgeRow[]> {
		return await this.sql<RoadEdgeRow[]>`SELECT * FROM road_edge WHERE society_id = ${societyId} ORDER BY created_at`;
	}

	async createNode(params: { id: string; societyId: string; lat: number; lng: number; label: string | null }): Promise<RoadNodeRow> {
		const [row] = await this.sql<RoadNodeRow[]>`
			INSERT INTO road_node (id, society_id, lat, lng, label) VALUES (${params.id}, ${params.societyId}, ${params.lat}, ${params.lng}, ${params.label})
			RETURNING *`;
		return row;
	}

	async deleteNode(id: string): Promise<void> {
		await this.sql`DELETE FROM road_node WHERE id = ${id}`;
	}

	async createEdge(params: { id: string; societyId: string; nodeAId: string; nodeBId: string; distanceKm: number }): Promise<RoadEdgeRow> {
		const [row] = await this.sql<RoadEdgeRow[]>`
			INSERT INTO road_edge (id, society_id, node_a_id, node_b_id, distance_km) VALUES (${params.id}, ${params.societyId}, ${params.nodeAId}, ${params.nodeBId}, ${params.distanceKm})
			RETURNING *`;
		return row;
	}

	async deleteEdge(id: string): Promise<void> {
		await this.sql`DELETE FROM road_edge WHERE id = ${id}`;
	}
}
