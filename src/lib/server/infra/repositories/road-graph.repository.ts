import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	listNodesBySociety(societyId: string): RoadNodeRow[] {
		return this.database
			.prepare('SELECT * FROM road_node WHERE society_id = ? ORDER BY created_at')
			.all(societyId) as RoadNodeRow[];
	}

	listEdgesBySociety(societyId: string): RoadEdgeRow[] {
		return this.database
			.prepare('SELECT * FROM road_edge WHERE society_id = ? ORDER BY created_at')
			.all(societyId) as RoadEdgeRow[];
	}

	createNode(params: { id: string; societyId: string; lat: number; lng: number; label: string | null }): RoadNodeRow {
		this.database
			.prepare('INSERT INTO road_node (id, society_id, lat, lng, label) VALUES (?, ?, ?, ?, ?)')
			.run(params.id, params.societyId, params.lat, params.lng, params.label);
		return this.database.prepare('SELECT * FROM road_node WHERE id = ?').get(params.id) as RoadNodeRow;
	}

	deleteNode(id: string): void {
		this.database.prepare('DELETE FROM road_node WHERE id = ?').run(id);
	}

	createEdge(params: { id: string; societyId: string; nodeAId: string; nodeBId: string; distanceKm: number }): RoadEdgeRow {
		this.database
			.prepare('INSERT INTO road_edge (id, society_id, node_a_id, node_b_id, distance_km) VALUES (?, ?, ?, ?, ?)')
			.run(params.id, params.societyId, params.nodeAId, params.nodeBId, params.distanceKm);
		return this.database.prepare('SELECT * FROM road_edge WHERE id = ?').get(params.id) as RoadEdgeRow;
	}

	deleteEdge(id: string): void {
		this.database.prepare('DELETE FROM road_edge WHERE id = ?').run(id);
	}
}
