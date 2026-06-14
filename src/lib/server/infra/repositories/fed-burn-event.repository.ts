import type postgres from 'postgres';

export interface FedBurnEventRow {
	id: string;
	mandate_ref: string;
	amount: number;
	executed_at: Date;
}

export class FedBurnEventRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: {
		id: string;
		mandateRef: string;
		amount: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO fed_burn_event (id, mandate_ref, amount)
			VALUES (${params.id}, ${params.mandateRef}, ${params.amount})
		`;
	}

	async listAll(): Promise<FedBurnEventRow[]> {
		return this.sql<FedBurnEventRow[]>`
			SELECT * FROM fed_burn_event ORDER BY executed_at DESC
		`;
	}
}
