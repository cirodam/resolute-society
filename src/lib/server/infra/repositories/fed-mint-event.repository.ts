import type postgres from 'postgres';

export interface FedMintEventRow {
	id: string;
	person_id: string;
	amount: number;
	created_at: Date;
}

export class FedMintEventRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: {
		id: string;
		personId: string;
		amount: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO fed_mint_event (id, person_id, person_age, amount)
			VALUES (${params.id}, ${params.personId}, 0, ${params.amount})
		`;
	}

}
