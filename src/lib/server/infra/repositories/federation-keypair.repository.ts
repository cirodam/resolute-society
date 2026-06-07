import type postgres from 'postgres';

export interface FederationKeypairRow {
	id: number;
	public_key: string;
	private_key: string;
	created_at: string;
}

export class FederationKeypairRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async get(): Promise<FederationKeypairRow | null> {
		const [row] = await this.sql<FederationKeypairRow[]>`SELECT * FROM federation_keypair WHERE id = 1`;
		return row ?? null;
	}

	async create(publicKey: string, privateKey: string): Promise<void> {
		await this.sql`INSERT INTO federation_keypair (id, public_key, private_key) VALUES (1, ${publicKey}, ${privateKey})`;
	}
}
