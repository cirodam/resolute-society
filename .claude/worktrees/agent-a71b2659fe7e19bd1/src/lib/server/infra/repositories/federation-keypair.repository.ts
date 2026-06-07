import type Database from 'better-sqlite3';

export interface FederationKeypairRow {
	id: number;
	public_key: string;
	private_key: string;
	created_at: string;
}

export class FederationKeypairRepository {
	constructor(private readonly database: Database.Database) {}

	get(): FederationKeypairRow | null {
		return (
			(this.database
				.prepare('SELECT * FROM federation_keypair WHERE id = 1')
				.get() as FederationKeypairRow | undefined) ?? null
		);
	}

	create(publicKey: string, privateKey: string): void {
		this.database
			.prepare(
				`INSERT INTO federation_keypair (id, public_key, private_key) VALUES (1, ?, ?)`
			)
			.run(publicKey, privateKey);
	}
}
