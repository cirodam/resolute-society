import type postgres from 'postgres';

export interface FedMintEventRow {
	id: string;
	person_id: string;
	person_age: number;
	amount: number;
	created_at: Date;
}

export class FedMintEventRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: {
		id: string;
		personId: string;
		personAge: number;
		amount: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO fed_mint_event (id, person_id, person_age, amount)
			VALUES (${params.id}, ${params.personId}, ${params.personAge}, ${params.amount})
		`;
	}

	async existsByPersonId(personId: string): Promise<boolean> {
		const [row] = await this.sql`SELECT 1 FROM fed_mint_event WHERE person_id = ${personId}`;
		return !!row;
	}

	async findByPersonId(personId: string): Promise<FedMintEventRow | null> {
		const [row] = await this.sql<FedMintEventRow[]>`
			SELECT * FROM fed_mint_event WHERE person_id = ${personId}
		`;
		return row ?? null;
	}
}
