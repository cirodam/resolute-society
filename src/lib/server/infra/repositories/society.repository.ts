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

const SOCIETY_KEYS = [
	'society.id',
	'society.handle',
	'society.name',
	'society.address',
	'society.lat',
	'society.lng',
	'society.federation_ip_address',
	'society.federation_public_key',
	'society.founder_person_id'
] as const;

type KVRow = { key: string; value: string };

export class SocietyRepository {
	constructor(private readonly sql: postgres.Sql) {}

	private async read(keys: string[]): Promise<Map<string, string>> {
		const rows = await this.sql<KVRow[]>`
			SELECT key, value FROM society_config WHERE key = ANY(${keys})
		`;
		return new Map(rows.map((r) => [r.key, r.value]));
	}

	private async write(entries: [string, string | null][]): Promise<void> {
		const toSet = entries.filter((e): e is [string, string] => e[1] !== null && e[1] !== '');
		const toDelete = entries.filter((e) => e[1] === null || e[1] === '').map(([k]) => k);

		if (toSet.length > 0) {
			const keys = toSet.map(([k]) => k);
			const values = toSet.map(([, v]) => v);
			await this.sql`
				INSERT INTO society_config (key, value)
				SELECT * FROM UNNEST(${keys}::text[], ${values}::text[])
				ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
			`;
		}

		if (toDelete.length > 0) {
			await this.sql`DELETE FROM society_config WHERE key = ANY(${toDelete})`;
		}
	}

	private toNullable(v: string | undefined): string | null {
		return v && v.length > 0 ? v : null;
	}

	private toFloat(v: string | undefined): number | null {
		if (!v) return null;
		const n = parseFloat(v);
		return isNaN(n) ? null : n;
	}

	async findByHandle(handle: string): Promise<SocietyHandleRow | null> {
		const kv = await this.read(['society.id', 'society.handle', 'society.name']);
		const id = kv.get('society.id');
		if (!id || kv.get('society.handle') !== handle) return null;
		return { id, name: kv.get('society.name') ?? '' };
	}

	async findById(societyId: string): Promise<SocietyIdentityRow | null> {
		const kv = await this.read(['society.id', 'society.name']);
		const id = kv.get('society.id');
		if (!id || id !== societyId) return null;
		return { id, name: kv.get('society.name') ?? '' };
	}

	async findDetailById(societyId: string): Promise<SocietyDetailRow | null> {
		const kv = await this.read([...SOCIETY_KEYS]);
		const id = kv.get('society.id');
		if (!id || id !== societyId) return null;
		return {
			id,
			handle: kv.get('society.handle') ?? '',
			name: kv.get('society.name') ?? '',
			address: this.toNullable(kv.get('society.address')),
			lat: this.toFloat(kv.get('society.lat')),
			lng: this.toFloat(kv.get('society.lng')),
			federation_ip_address: this.toNullable(kv.get('society.federation_ip_address')),
			federation_public_key: this.toNullable(kv.get('society.federation_public_key'))
		};
	}

	async listAll(): Promise<SocietyListRow[]> {
		const kv = await this.read([...SOCIETY_KEYS]);
		const id = kv.get('society.id');
		if (!id) return [];
		return [
			{
				id,
				handle: kv.get('society.handle') ?? '',
				name: kv.get('society.name') ?? '',
				address: this.toNullable(kv.get('society.address')),
				lat: this.toFloat(kv.get('society.lat')),
				lng: this.toFloat(kv.get('society.lng')),
				federation_ip_address: this.toNullable(kv.get('society.federation_ip_address'))
			}
		];
	}

	async handleExists(handle: string): Promise<boolean> {
		const kv = await this.read(['society.handle']);
		return kv.get('society.handle') === handle;
	}

	async createSociety(params: {
		societyId: string;
		handle: string;
		name: string;
		address: string | null;
	}): Promise<void> {
		await this.write([
			['society.id', params.societyId],
			['society.handle', params.handle],
			['society.name', params.name],
			['society.address', params.address]
		]);
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
		await this.write([
			['society.handle', params.handle],
			['society.name', params.name],
			['society.address', params.address],
			['society.lat', params.lat !== null ? String(params.lat) : null],
			['society.lng', params.lng !== null ? String(params.lng) : null],
			['society.federation_ip_address', params.federationIpAddress]
		]);
	}

	async storeFederationPublicKey(_societyId: string, publicKey: string): Promise<void> {
		await this.write([['society.federation_public_key', publicKey]]);
	}

	async setFounder(_societyId: string, founderPersonId: string): Promise<void> {
		await this.write([['society.founder_person_id', founderPersonId]]);
	}

	async findFounderById(societyId: string): Promise<SocietyFounderRow | null> {
		const kv = await this.read(['society.id', 'society.founder_person_id']);
		const id = kv.get('society.id');
		if (!id || id !== societyId) return null;
		return { founder_person_id: this.toNullable(kv.get('society.founder_person_id')) };
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
