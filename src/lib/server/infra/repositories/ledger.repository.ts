import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import type { EntityType } from '$lib/server/types';

export type { EntityType };

export interface CalculateMoneySupplyResult {
	societyBalance: number;
	personTotal: number;
	associationTotal: number;
	totalSupply: number;
}

export interface TxnRow {
	id: string;
	from_type: string;
	from_id: string;
	from_name: string;
	from_handle: string;
	to_type: string;
	to_id: string;
	to_name: string;
	to_handle: string;
	amount: number;
	note: string | null;
	created_at: string;
}

export interface CreateTransactionParams {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}

export class LedgerRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async calculateBalance(entityType: EntityType, entityId: string): Promise<number> {
		const [credits] = await this.sql<Array<{ total: string }>>`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM txn WHERE to_type = ${entityType} AND to_id = ${entityId}`;

		const [debits] = await this.sql<Array<{ total: string }>>`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM txn WHERE from_type = ${entityType} AND from_id = ${entityId}`;

		return Number(credits.total) - Number(debits.total);
	}

	async calculateBalances(type: EntityType, ids: string[]): Promise<Map<string, number>> {
		if (ids.length === 0) return new Map();

		const balances = new Map<string, number>();
		for (const id of ids) balances.set(id, 0);

		const credits = await this.sql<Array<{ to_id: string; total: string }>>`
			SELECT to_id, SUM(amount) as total
			FROM txn WHERE to_type = ${type} AND to_id = ANY(${ids})
			GROUP BY to_id`;

		const debits = await this.sql<Array<{ from_id: string; total: string }>>`
			SELECT from_id, SUM(amount) as total
			FROM txn WHERE from_type = ${type} AND from_id = ANY(${ids})
			GROUP BY from_id`;

		for (const credit of credits)
			balances.set(credit.to_id, (balances.get(credit.to_id) ?? 0) + Number(credit.total));
		for (const debit of debits)
			balances.set(debit.from_id, (balances.get(debit.from_id) ?? 0) - Number(debit.total));

		return balances;
	}

	async calculateMoneySupply(societyId: string): Promise<CalculateMoneySupplyResult> {
		const societyBalance = await this.calculateBalance('society', societyId);

		const people = await this.sql<Array<{ id: string }>>`SELECT id FROM person WHERE society_id = ${societyId}`;
		const associations = await this.sql<Array<{ id: string }>>`SELECT id FROM association WHERE society_id = ${societyId}`;

		const personBalances = await this.calculateBalances(
			'person',
			people.map((p) => p.id)
		);
		const associationBalances = await this.calculateBalances(
			'association',
			associations.map((a) => a.id)
		);

		const sum = (m: Map<string, number>) => {
			let total = 0;
			for (const v of m.values()) total += v;
			return total;
		};

		const personTotal = sum(personBalances);
		const associationTotal = sum(associationBalances);

		return {
			societyBalance,
			personTotal,
			associationTotal,
			totalSupply: societyBalance + personTotal + associationTotal
		};
	}

	private readonly transactionSelect = `
		SELECT
			txn.id,
			txn.from_type,
			txn.from_id,
			COALESCE(
				CASE WHEN txn.from_type = 'person' THEN TRIM(COALESCE(fp.given_name, '') || ' ' || COALESCE(fp.surname, '')) END,
				fa.name,
				fs.name,
				'System'
			) AS from_name,
			COALESCE(fp.handle, fa.handle, fs.handle, 'system') AS from_handle,
			txn.to_type,
			txn.to_id,
			COALESCE(
				CASE WHEN txn.to_type = 'person' THEN TRIM(COALESCE(tp.given_name, '') || ' ' || COALESCE(tp.surname, '')) END,
				ta.name,
				ts.name,
				'System'
			) AS to_name,
			COALESCE(tp.handle, ta.handle, ts.handle, 'system') AS to_handle,
			txn.amount,
			txn.note,
			txn.created_at
		FROM txn
		LEFT JOIN person fp ON txn.from_type = 'person' AND fp.id = txn.from_id
		LEFT JOIN association fa ON txn.from_type = 'association' AND fa.id = txn.from_id
		LEFT JOIN society_config fs ON txn.from_type = 'society' AND fs.id = txn.from_id
		LEFT JOIN person tp ON txn.to_type = 'person' AND tp.id = txn.to_id
		LEFT JOIN association ta ON txn.to_type = 'association' AND ta.id = txn.to_id
		LEFT JOIN society_config ts ON txn.to_type = 'society' AND ts.id = txn.to_id
	`;

	async listPersonTransactions(personId: string): Promise<TxnRow[]> {
		return await this.sql<TxnRow[]>`
			${this.sql.unsafe(this.transactionSelect)}
			WHERE (from_type = 'person' AND from_id = ${personId})
			   OR (to_type = 'person' AND to_id = ${personId})
			ORDER BY txn.created_at DESC`;
	}

	async listSocietyTransactions(societyId: string): Promise<TxnRow[]> {
		return await this.sql<TxnRow[]>`
			${this.sql.unsafe(this.transactionSelect)}
			WHERE (from_type = 'society' AND from_id = ${societyId})
			   OR (to_type = 'society' AND to_id = ${societyId})
			ORDER BY txn.created_at DESC`;
	}

	async listForDate(date: string): Promise<TxnRow[]> {
		return await this.sql<TxnRow[]>`
			${this.sql.unsafe(this.transactionSelect)}
			WHERE DATE(txn.created_at) = ${date}
			ORDER BY txn.created_at ASC`;
	}

	async countForDate(date: string): Promise<number> {
		const [result] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM txn WHERE DATE(created_at) = ${date}`;
		return result.count;
	}

	async createTransaction(params: CreateTransactionParams): Promise<string> {
		const id = randomUUID();
		await this.sql`
			INSERT INTO txn (id, from_type, from_id, to_type, to_id, amount, note)
			VALUES (${id}, ${params.fromType}, ${params.fromId}, ${params.toType}, ${params.toId}, ${params.amount}, ${params.note})`;
		return id;
	}
}
