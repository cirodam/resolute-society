import type postgres from 'postgres';

export type PeerSocietyStanding = 'forming' | 'good_standing' | 'suspended' | 'defunct';

export interface PeerSocietyRow {
	id: string;
	handle: string;
	name: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	ip_address: string | null;
	public_key: string | null;
	standing: PeerSocietyStanding;
	member_count: number;
	synced_at: Date;
}

export interface PeerSocietyUpsert {
	id: string;
	handle: string;
	name: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	ip_address: string | null;
	public_key: string | null;
	standing: PeerSocietyStanding;
	member_count: number;
}

export class PeerSocietyRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listAll(): Promise<PeerSocietyRow[]> {
		return this.sql<PeerSocietyRow[]>`SELECT * FROM peer_society ORDER BY name ASC`;
	}

	async findByHandle(handle: string): Promise<PeerSocietyRow | null> {
		const [row] = await this.sql<PeerSocietyRow[]>`
			SELECT * FROM peer_society WHERE handle = ${handle}
		`;
		return row ?? null;
	}

	async upsertMany(rows: PeerSocietyUpsert[]): Promise<void> {
		if (rows.length === 0) return;
		const now = new Date();
		for (const s of rows) {
			await this.sql`
				INSERT INTO peer_society (id, handle, name, address, lat, lng, ip_address, public_key, standing, member_count, synced_at)
				VALUES (${s.id}, ${s.handle}, ${s.name}, ${s.address}, ${s.lat}, ${s.lng}, ${s.ip_address}, ${s.public_key}, ${s.standing}, ${s.member_count}, ${now})
				ON CONFLICT (id) DO UPDATE SET
					handle       = EXCLUDED.handle,
					name         = EXCLUDED.name,
					address      = EXCLUDED.address,
					lat          = EXCLUDED.lat,
					lng          = EXCLUDED.lng,
					ip_address   = EXCLUDED.ip_address,
					public_key   = EXCLUDED.public_key,
					standing     = EXCLUDED.standing,
					member_count = EXCLUDED.member_count,
					synced_at    = EXCLUDED.synced_at
			`;
		}
	}
}
