import type postgres from 'postgres';

export interface SocietyHandleRow {
	id: string;
	name: string;
}

export interface SocietyIdentityRow {
	id: string;
	name: string;
}

export interface SocietyDetailRow {
	id: string;
	handle: string;
	name: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	federation_ip_address: string | null;
	federation_public_key: string | null;
}

export interface SocietyFounderRow {
	founder_person_id: string | null;
}

export interface SocietyListRow {
	id: string;
	handle: string;
	name: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	federation_ip_address: string | null;
}

export class SocietyRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async findByHandle(handle: string): Promise<SocietyHandleRow | null> {
		const [row] = await this.sql<SocietyHandleRow[]>`SELECT id, name FROM society_config WHERE handle = ${handle}`;
		return row ?? null;
	}

	async findById(societyId: string): Promise<SocietyIdentityRow | null> {
		const [row] = await this.sql<SocietyIdentityRow[]>`SELECT id, name FROM society_config WHERE id = ${societyId}`;
		return row ?? null;
	}

	async findDetailById(societyId: string): Promise<SocietyDetailRow | null> {
		const [row] = await this.sql<SocietyDetailRow[]>`
			SELECT id, handle, name, address, lat, lng, federation_ip_address, federation_public_key FROM society_config WHERE id = ${societyId}`;
		return row ?? null;
	}

	async listAll(): Promise<SocietyListRow[]> {
		return await this.sql<SocietyListRow[]>`
			SELECT id, handle, name, address, lat, lng, federation_ip_address FROM society_config ORDER BY name`;
	}

	async handleExists(handle: string): Promise<boolean> {
		const [existing] = await this.sql`SELECT id FROM society_config WHERE handle = ${handle}`;
		return !!existing;
	}

	async createSociety(params: {
		societyId: string;
		handle: string;
		name: string;
		address: string | null;
	}): Promise<void> {
		await this.sql`INSERT INTO society_config (id, handle, name, address) VALUES (${params.societyId}, ${params.handle}, ${params.name}, ${params.address})`;
	}

	async updateSociety(params: {
		societyId: string;
		handle: string;
		name: string;
		address: string | null;
		lat: number | null;
		lng: number | null;
		federationIpAddress: string | null;
	}): Promise<void> {
		await this.sql`
			UPDATE society_config
			SET handle = ${params.handle},
			    name = ${params.name},
			    address = ${params.address},
			    lat = ${params.lat},
			    lng = ${params.lng},
			    federation_ip_address = ${params.federationIpAddress}
			WHERE id = ${params.societyId}`;
	}

	async storeFederationPublicKey(societyId: string, publicKey: string): Promise<void> {
		await this.sql`UPDATE society_config SET federation_public_key = ${publicKey} WHERE id = ${societyId}`;
	}

	async setFounder(societyId: string, founderPersonId: string): Promise<void> {
		await this.sql`UPDATE society_config SET founder_person_id = ${founderPersonId} WHERE id = ${societyId}`;
	}

	async findFounderById(societyId: string): Promise<SocietyFounderRow | null> {
		const [row] = await this.sql<SocietyFounderRow[]>`SELECT founder_person_id FROM society_config WHERE id = ${societyId}`;
		return row ?? null;
	}

	async listPermissionCodesForPerson(societyId: string, personId: string): Promise<string[]> {
		const rows = await this.sql<Array<{ code: string }>>`
			SELECT DISTINCT perm.code
			FROM position pos
			JOIN position_permission pp ON pp.position_id = pos.id
			JOIN permission perm ON perm.id = pp.permission_id
			WHERE pos.society_id = ${societyId} AND pos.current_person_id = ${personId}`;
		return rows.map((row) => row.code);
	}
}
