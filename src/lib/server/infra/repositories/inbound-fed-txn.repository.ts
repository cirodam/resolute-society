import type postgres from 'postgres';

export interface InboundFedTxnRow {
	id: string;
	from_principal: string;
	to_principal: string;
	amount: number;
	received_at: Date;
}

export class InboundFedTxnRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: {
		id: string;
		fromPrincipal: string;
		toPrincipal: string;
		amount: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO inbound_fed_txn (id, from_principal, to_principal, amount)
			VALUES (${params.id}, ${params.fromPrincipal}, ${params.toPrincipal}, ${params.amount})
		`;
	}

	async existsById(id: string): Promise<boolean> {
		const [row] = await this.sql`SELECT 1 FROM inbound_fed_txn WHERE id = ${id}`;
		return !!row;
	}

	async findById(id: string): Promise<InboundFedTxnRow | null> {
		const [row] = await this.sql<InboundFedTxnRow[]>`
			SELECT * FROM inbound_fed_txn WHERE id = ${id}
		`;
		return row ?? null;
	}

	async listAll(limit = 200): Promise<InboundFedTxnRow[]> {
		return this.sql<InboundFedTxnRow[]>`
			SELECT * FROM inbound_fed_txn ORDER BY received_at DESC LIMIT ${limit}
		`;
	}
}
