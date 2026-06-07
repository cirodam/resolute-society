import type Database from 'better-sqlite3';
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
	constructor(private readonly database: Database.Database) {}

	calculateBalance(entityType: EntityType, entityId: string): number {
		const credits = this.database
			.prepare(
				`SELECT COALESCE(SUM(amount), 0) as total
				 FROM txn WHERE to_type = ? AND to_id = ?`
			)
			.get(entityType, entityId) as { total: number };

		const debits = this.database
			.prepare(
				`SELECT COALESCE(SUM(amount), 0) as total
				 FROM txn WHERE from_type = ? AND from_id = ?`
			)
			.get(entityType, entityId) as { total: number };

		return credits.total - debits.total;
	}

	calculateBalances(type: EntityType, ids: string[]): Map<string, number> {
		if (ids.length === 0) return new Map();

		const balances = new Map<string, number>();
		for (const id of ids) balances.set(id, 0);

		const placeholders = ids.map(() => '?').join(',');

		const credits = this.database
			.prepare(
				`SELECT to_id, SUM(amount) as total
				 FROM txn WHERE to_type = ? AND to_id IN (${placeholders})
				 GROUP BY to_id`
			)
			.all(type, ...ids) as Array<{ to_id: string; total: number }>;

		const debits = this.database
			.prepare(
				`SELECT from_id, SUM(amount) as total
				 FROM txn WHERE from_type = ? AND from_id IN (${placeholders})
				 GROUP BY from_id`
			)
			.all(type, ...ids) as Array<{ from_id: string; total: number }>;

		for (const credit of credits)
			balances.set(credit.to_id, (balances.get(credit.to_id) ?? 0) + credit.total);
		for (const debit of debits)
			balances.set(debit.from_id, (balances.get(debit.from_id) ?? 0) - debit.total);

		return balances;
	}

	calculateMoneySupply(societyId: string): CalculateMoneySupplyResult {
		const societyBalance = this.calculateBalance('society', societyId);

		const people = this.database
			.prepare('SELECT id FROM person WHERE society_id = ?')
			.all(societyId) as Array<{ id: string }>;

		const associations = this.database
			.prepare('SELECT id FROM association WHERE society_id = ?')
			.all(societyId) as Array<{ id: string }>;

		const personBalances = this.calculateBalances(
			'person',
			people.map((p) => p.id)
		);
		const associationBalances = this.calculateBalances(
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

	listPersonTransactions(personId: string): TxnRow[] {
		return this.database
			.prepare(
				`${this.transactionSelect}
				 WHERE (from_type = 'person' AND from_id = ?)
				    OR (to_type = 'person' AND to_id = ?)
				 ORDER BY txn.created_at DESC`
			)
			.all(personId, personId) as TxnRow[];
	}

	listSocietyTransactions(societyId: string): TxnRow[] {
		return this.database
			.prepare(
				`${this.transactionSelect}
				 WHERE (from_type = 'society' AND from_id = ?)
				    OR (to_type = 'society' AND to_id = ?)
				 ORDER BY txn.created_at DESC`
			)
			.all(societyId, societyId) as TxnRow[];
	}

	listForDate(date: string): TxnRow[] {
		return this.database
			.prepare(
				`${this.transactionSelect}
				 WHERE DATE(txn.created_at) = ?
				 ORDER BY txn.created_at ASC`
			)
			.all(date) as TxnRow[];
	}

	countForDate(date: string): number {
		const result = this.database
			.prepare(`SELECT COUNT(*) as count FROM txn WHERE DATE(created_at) = ?`)
			.get(date) as { count: number };
		return result.count;
	}

	createTransaction(params: CreateTransactionParams): string {
		const id = randomUUID();
		this.database
			.prepare(
				`INSERT INTO txn (id, from_type, from_id, to_type, to_id, amount, note)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(id, params.fromType, params.fromId, params.toType, params.toId, params.amount, params.note);
		return id;
	}
}
