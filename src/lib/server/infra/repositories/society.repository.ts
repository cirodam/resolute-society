import type Database from 'better-sqlite3';

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
	federation_url: string | null;
	federation_ip_address: string | null;
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
	federation_url: string | null;
	federation_ip_address: string | null;
}

export class SocietyRepository {
	constructor(private readonly database: Database.Database) {}

	findByHandle(handle: string): SocietyHandleRow | null {
		const society = this.database
			.prepare('SELECT id, name FROM society_config WHERE handle = ?')
			.get(handle) as SocietyHandleRow | undefined;

		return society ?? null;
	}

	findById(societyId: string): SocietyIdentityRow | null {
		const society = this.database
			.prepare('SELECT id, name FROM society_config WHERE id = ?')
			.get(societyId) as SocietyIdentityRow | undefined;

		return society ?? null;
	}

	findDetailById(societyId: string): SocietyDetailRow | null {
		const society = this.database
			.prepare(
				'SELECT id, handle, name, address, lat, lng, federation_url, federation_ip_address FROM society_config WHERE id = ?'
			)
			.get(societyId) as SocietyDetailRow | undefined;

		return society ?? null;
	}

	listAll(): SocietyListRow[] {
		return this.database
			.prepare(
				'SELECT id, handle, name, address, lat, lng, federation_url, federation_ip_address FROM society_config ORDER BY name'
			)
			.all() as SocietyListRow[];
	}

	handleExists(handle: string): boolean {
		const existing = this.database.prepare('SELECT id FROM society_config WHERE handle = ?').get(handle);
		return !!existing;
	}

	createSociety(params: {
		societyId: string;
		handle: string;
		name: string;
		address: string | null;
	}): void {
		this.database
			.prepare(`INSERT INTO society_config (id, handle, name, address) VALUES (?, ?, ?, ?)`)
			.run(params.societyId, params.handle, params.name, params.address);
	}

	updateSociety(params: {
		societyId: string;
		handle: string;
		name: string;
		address: string | null;
		lat: number | null;
		lng: number | null;
		federationUrl: string | null;
		federationIpAddress: string | null;
	}): void {
		this.database
			.prepare(
				`UPDATE society_config
				 SET handle = ?,
				     name = ?,
				     address = ?,
				     lat = ?,
				     lng = ?,
				     federation_url = ?,
				     federation_ip_address = ?
				 WHERE id = ?`
			)
			.run(
				params.handle,
				params.name,
				params.address,
				params.lat,
				params.lng,
				params.federationUrl,
				params.federationIpAddress,
				params.societyId
			);
	}

	setFounder(societyId: string, founderPersonId: string): void {
		this.database
			.prepare('UPDATE society_config SET founder_person_id = ? WHERE id = ?')
			.run(founderPersonId, societyId);
	}

	findFounderById(societyId: string): SocietyFounderRow | null {
		const society = this.database
			.prepare('SELECT founder_person_id FROM society_config WHERE id = ?')
			.get(societyId) as SocietyFounderRow | undefined;

		return society ?? null;
	}

	listPermissionCodesForPerson(societyId: string, personId: string): string[] {
		return (
			this.database
				.prepare(
					`
                SELECT DISTINCT perm.code
                FROM position pos
                JOIN position_permission pp ON pp.position_id = pos.id
                JOIN permission perm ON perm.id = pp.permission_id
                WHERE pos.society_id = ? AND pos.current_person_id = ?
            `
				)
				.all(societyId, personId) as Array<{ code: string }>
		).map((row) => row.code);
	}
}
