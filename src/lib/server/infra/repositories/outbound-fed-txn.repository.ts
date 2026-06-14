import type postgres from 'postgres';

export type OutboundFedTxnStatus = 'pending' | 'settled';

export interface OutboundFedTxnRow {
	id: string;
	from_principal: string;
	to_principal: string;
	amount: number;
	status: OutboundFedTxnStatus;
	created_at: Date;
	settled_at: Date | null;
}

export class OutboundFedTxnRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: {
		id: string;
		fromPrincipal: string;
		toPrincipal: string;
		amount: number;
	}): Promise<void> {
		await this.sql`
			INSERT INTO outbound_fed_txn (id, from_principal, to_principal, amount)
			VALUES (${params.id}, ${params.fromPrincipal}, ${params.toPrincipal}, ${params.amount})
		`;
	}

	async markSettled(id: string): Promise<void> {
		await this.sql`
			UPDATE outbound_fed_txn
			SET status = 'settled', settled_at = NOW()
			WHERE id = ${id}
		`;
	}

	async listPending(): Promise<OutboundFedTxnRow[]> {
		return this.sql<OutboundFedTxnRow[]>`
			SELECT * FROM outbound_fed_txn WHERE status = 'pending' ORDER BY created_at ASC
		`;
	}

	async findById(id: string): Promise<OutboundFedTxnRow | null> {
		const [row] = await this.sql<OutboundFedTxnRow[]>`
			SELECT * FROM outbound_fed_txn WHERE id = ${id}
		`;
		return row ?? null;
	}

	async listAll(limit = 200): Promise<OutboundFedTxnRow[]> {
		return this.sql<OutboundFedTxnRow[]>`
			SELECT * FROM outbound_fed_txn ORDER BY created_at DESC LIMIT ${limit}
		`;
	}
}
