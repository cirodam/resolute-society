import type postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import type { EntityType } from '$lib/server/types';
import { computeChainHash, GENESIS_PREV_HASH } from '$lib/server/infra/chain';

export type { EntityType };

export interface CalculateMoneySupplyResult {
	societyBalance: number;
	personTotal: number;
	associationTotal: number;
	totalSupply: number;
}

export interface TxnRowWithBalance extends TxnRow {
	running_balance: number;
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
		const [checkpoint] = await this.sql<Array<{ balance: string; as_of_date: string }>>`
			SELECT balance, as_of_date FROM balance_checkpoint
			WHERE entity_type = ${entityType} AND entity_id = ${entityId}
			ORDER BY as_of_date DESC LIMIT 1`;

		const base = checkpoint ? Number(checkpoint.balance) : 0;
		const sinceFilter = checkpoint
			? this.sql`AND created_at::date > ${checkpoint.as_of_date}::date`
			: this.sql``;

		const [credits] = await this.sql<Array<{ total: string }>>`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM txn WHERE to_type = ${entityType} AND to_id = ${entityId} ${sinceFilter}`;

		const [debits] = await this.sql<Array<{ total: string }>>`
			SELECT COALESCE(SUM(amount), 0) as total
			FROM txn WHERE from_type = ${entityType} AND from_id = ${entityId} ${sinceFilter}`;

		return base + Number(credits.total) - Number(debits.total);
	}

	async calculateBalances(type: EntityType, ids: string[]): Promise<Map<string, number>> {
		if (ids.length === 0) return new Map();

		const balances = new Map<string, number>();
		for (const id of ids) balances.set(id, 0);

		// Load the most recent checkpoint per entity
		const checkpoints = await this.sql<Array<{ entity_id: string; balance: string; as_of_date: string }>>`
			SELECT DISTINCT ON (entity_id) entity_id, balance, as_of_date
			FROM balance_checkpoint
			WHERE entity_type = ${type} AND entity_id = ANY(${ids})
			ORDER BY entity_id, as_of_date DESC`;

		const checkpointMap = new Map(checkpoints.map((c) => [c.entity_id, c]));

		for (const [id, cp] of checkpointMap) {
			balances.set(id, Number(cp.balance));
		}

		// Group IDs by their checkpoint date (empty string = no checkpoint, sum all txns)
		const bySince = new Map<string, string[]>();
		for (const id of ids) {
			const since = checkpointMap.get(id)?.as_of_date ?? '';
			const group = bySince.get(since) ?? [];
			group.push(id);
			bySince.set(since, group);
		}

		for (const [since, groupIds] of bySince) {
			const sinceFilter = since ? this.sql`AND created_at::date > ${since}::date` : this.sql``;

			const credits = await this.sql<Array<{ to_id: string; total: string }>>`
				SELECT to_id, SUM(amount) as total
				FROM txn WHERE to_type = ${type} AND to_id = ANY(${groupIds}) ${sinceFilter}
				GROUP BY to_id`;

			const debits = await this.sql<Array<{ from_id: string; total: string }>>`
				SELECT from_id, SUM(amount) as total
				FROM txn WHERE from_type = ${type} AND from_id = ANY(${groupIds}) ${sinceFilter}
				GROUP BY from_id`;

			for (const credit of credits)
				balances.set(credit.to_id, (balances.get(credit.to_id) ?? 0) + Number(credit.total));
			for (const debit of debits)
				balances.set(debit.from_id, (balances.get(debit.from_id) ?? 0) - Number(debit.total));
		}

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

	// Snapshot balances for all entities touched by transactions older than
	// retentionDays, then delete those transactions. The snapshot stands in for
	// the deleted history so balance calculations remain correct.
	async pruneLedger(retentionDays = 28): Promise<void> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - retentionDays);
		const cutoffDate = cutoff.toISOString().substring(0, 10);

		const affected = await this.sql<Array<{ entity_type: string; entity_id: string }>>`
			SELECT DISTINCT from_type AS entity_type, from_id AS entity_id FROM txn
			WHERE created_at::date <= ${cutoffDate}
			UNION
			SELECT DISTINCT to_type AS entity_type, to_id AS entity_id FROM txn
			WHERE created_at::date <= ${cutoffDate}`;

		if (affected.length === 0) return;

		// Single-society app: one society_config row for all checkpoint writes
		const [society] = await this.sql<Array<{ id: string }>>`SELECT value AS id FROM society_config WHERE key = 'society.id'`;
		if (!society) {
			console.warn('[ledger] prune skipped: no society configured');
			return;
		}
		const societyId = society.id;

		// Compute full current balances for all affected entities
		const byType = new Map<EntityType, string[]>();
		for (const e of affected) {
			const ids = byType.get(e.entity_type as EntityType) ?? [];
			ids.push(e.entity_id);
			byType.set(e.entity_type as EntityType, ids);
		}

		const balanceMap = new Map<string, number>();
		for (const [type, ids] of byType) {
			const balances = await this.calculateBalances(type, ids);
			for (const [id, balance] of balances) balanceMap.set(id, balance);
		}

		// Chain anchor: chain_hash of the last transaction being pruned
		const [lastPruned] = await this.sql<Array<{ chain_hash: string }>>`
			SELECT chain_hash FROM txn
			WHERE created_at::date <= ${cutoffDate} AND chain_hash IS NOT NULL
			ORDER BY created_at DESC, id DESC LIMIT 1`;

		await this.sql.begin(async (sql) => {
			// Replace old checkpoints with a fresh one at the cutoff date
			for (const [type, ids] of byType) {
				await sql`
					DELETE FROM balance_checkpoint
					WHERE entity_type = ${type} AND entity_id = ANY(${ids}) AND as_of_date < ${cutoffDate}`;
			}
			for (const e of affected) {
				const balance = balanceMap.get(e.entity_id) ?? 0;
				await sql`
					INSERT INTO balance_checkpoint (id, society_id, entity_type, entity_id, balance, as_of_date)
					VALUES (${randomUUID()}, ${societyId}, ${e.entity_type}, ${e.entity_id}, ${balance}, ${cutoffDate})
					ON CONFLICT (society_id, entity_type, entity_id, as_of_date) DO UPDATE SET balance = excluded.balance`;
			}

			// Persist chain anchor so verifyChain works on the remaining transactions
			if (lastPruned) {
				await sql`
					INSERT INTO ledger_prune_cursor (id, pruned_before, chain_anchor_hash)
					VALUES (1, ${cutoffDate}, ${lastPruned.chain_hash})
					ON CONFLICT (id) DO UPDATE
						SET pruned_before = excluded.pruned_before,
						    chain_anchor_hash = excluded.chain_anchor_hash`;
			}

			await sql`DELETE FROM txn WHERE created_at::date <= ${cutoffDate}`;
		});

		console.log(`[ledger] pruned transactions on or before ${cutoffDate} (${affected.length} entities snapshotted)`);
	}

	private readonly transactionSelect = `
		SELECT
			txn.id,
			txn.from_type,
			txn.from_id,
			COALESCE(
				CASE WHEN txn.from_type = 'person' THEN TRIM(COALESCE(fp.given_name, '') || ' ' || COALESCE(fp.surname, '')) END,
				fa.name,
				CASE WHEN txn.from_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.name') END,
				'System'
			) AS from_name,
			COALESCE(
				fp.handle, fa.handle,
				CASE WHEN txn.from_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.handle') END,
				'system'
			) AS from_handle,
			txn.to_type,
			txn.to_id,
			COALESCE(
				CASE WHEN txn.to_type = 'person' THEN TRIM(COALESCE(tp.given_name, '') || ' ' || COALESCE(tp.surname, '')) END,
				ta.name,
				CASE WHEN txn.to_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.name') END,
				'System'
			) AS to_name,
			COALESCE(
				tp.handle, ta.handle,
				CASE WHEN txn.to_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.handle') END,
				'system'
			) AS to_handle,
			txn.amount,
			txn.note,
			txn.created_at
		FROM txn
		LEFT JOIN person fp ON txn.from_type = 'person' AND fp.id = txn.from_id
		LEFT JOIN association fa ON txn.from_type = 'association' AND fa.id = txn.from_id
		LEFT JOIN person tp ON txn.to_type = 'person' AND tp.id = txn.to_id
		LEFT JOIN association ta ON txn.to_type = 'association' AND ta.id = txn.to_id
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

	async listPersonTransactionsPaginated(personId: string, limit: number, offset: number): Promise<TxnRowWithBalance[]> {
		return await this.sql<TxnRowWithBalance[]>`
			WITH base AS (
				SELECT
					txn.id, txn.from_type, txn.from_id, txn.to_type, txn.to_id,
					txn.amount, txn.note, txn.created_at,
					COALESCE(
						CASE WHEN txn.from_type = 'person' THEN TRIM(COALESCE(fp.given_name, '') || ' ' || COALESCE(fp.surname, '')) END,
						fa.name,
						CASE WHEN txn.from_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.name') END,
						'System'
					) AS from_name,
					COALESCE(
						fp.handle, fa.handle,
						CASE WHEN txn.from_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.handle') END,
						'system'
					) AS from_handle,
					COALESCE(
						CASE WHEN txn.to_type = 'person' THEN TRIM(COALESCE(tp.given_name, '') || ' ' || COALESCE(tp.surname, '')) END,
						ta.name,
						CASE WHEN txn.to_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.name') END,
						'System'
					) AS to_name,
					COALESCE(
						tp.handle, ta.handle,
						CASE WHEN txn.to_type = 'society' THEN (SELECT value FROM society_config WHERE key = 'society.handle') END,
						'system'
					) AS to_handle,
					SUM(
						CASE
							WHEN txn.to_type = 'person' AND txn.to_id = ${personId} THEN txn.amount
							WHEN txn.from_type = 'person' AND txn.from_id = ${personId} THEN -txn.amount
							ELSE 0
						END
					) OVER (ORDER BY txn.created_at ASC, txn.id ASC) AS running_balance
				FROM txn
				LEFT JOIN person fp ON txn.from_type = 'person' AND fp.id = txn.from_id
				LEFT JOIN association fa ON txn.from_type = 'association' AND fa.id = txn.from_id
				LEFT JOIN person tp ON txn.to_type = 'person' AND tp.id = txn.to_id
				LEFT JOIN association ta ON txn.to_type = 'association' AND ta.id = txn.to_id
				WHERE (txn.from_type = 'person' AND txn.from_id = ${personId})
				   OR (txn.to_type = 'person' AND txn.to_id = ${personId})
			)
			SELECT * FROM base
			ORDER BY created_at DESC, id DESC
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countPersonTransactions(personId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM txn
			WHERE (from_type = 'person' AND from_id = ${personId})
			   OR (to_type = 'person' AND to_id = ${personId})`;
		return parseInt(row.count, 10);
	}

	async listSocietyTransactionsPaginated(societyId: string, limit: number, offset: number): Promise<TxnRow[]> {
		return await this.sql<TxnRow[]>`
			${this.sql.unsafe(this.transactionSelect)}
			WHERE (from_type = 'society' AND from_id = ${societyId})
			   OR (to_type = 'society' AND to_id = ${societyId})
			ORDER BY txn.created_at DESC, txn.id DESC
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countSocietyTransactions(societyId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM txn
			WHERE (from_type = 'society' AND from_id = ${societyId})
			   OR (to_type = 'society' AND to_id = ${societyId})`;
		return parseInt(row.count, 10);
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

		const execute = async (sql: postgres.Sql | postgres.TransactionSql) => {
			await sql`LOCK TABLE txn IN SHARE ROW EXCLUSIVE MODE`;

			const [last] = await sql<Array<{ chain_hash: string }>>`
				SELECT chain_hash FROM txn WHERE chain_hash IS NOT NULL
				ORDER BY created_at DESC, id DESC LIMIT 1`;

			let prevHash = last?.chain_hash;
			if (!prevHash) {
				// After a ledger prune all txn rows may be gone; resume from stored anchor
				const [cursor] = await sql<Array<{ chain_anchor_hash: string }>>`
					SELECT chain_anchor_hash FROM ledger_prune_cursor WHERE id = 1`;
				prevHash = cursor?.chain_anchor_hash ?? GENESIS_PREV_HASH;
			}

			const [row] = await sql<Array<{ amount: number; created_at: Date | string }>>`
				INSERT INTO txn (id, from_type, from_id, to_type, to_id, amount, note)
				VALUES (${id}, ${params.fromType}, ${params.fromId}, ${params.toType}, ${params.toId}, ${params.amount}, ${params.note})
				RETURNING amount, created_at`;

			const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
			const chainHash = computeChainHash(
				prevHash, id,
				params.fromType, params.fromId,
				params.toType, params.toId,
				row.amount, params.note, createdAt
			);

			await sql`UPDATE txn SET chain_hash = ${chainHash} WHERE id = ${id}`;
		};

		if (typeof (this.sql as postgres.Sql).begin === 'function') {
			await (this.sql as postgres.Sql).begin(execute);
		} else {
			await execute(this.sql);
		}

		return id;
	}

	async verifyChain(): Promise<{ valid: boolean; invalidAt?: string }> {
		const [cursor] = await this.sql<Array<{ pruned_before: string; chain_anchor_hash: string }>>`
			SELECT pruned_before, chain_anchor_hash FROM ledger_prune_cursor WHERE id = 1`;

		const startHash = cursor?.chain_anchor_hash ?? GENESIS_PREV_HASH;
		const afterFilter = cursor
			? this.sql`AND created_at::date > ${cursor.pruned_before}::date`
			: this.sql``;

		const rows = await this.sql<Array<{
			id: string; from_type: string; from_id: string; to_type: string; to_id: string;
			amount: number; note: string | null; chain_hash: string; created_at: Date | string;
		}>>`
			SELECT id, from_type, from_id, to_type, to_id, amount, note, chain_hash, created_at
			FROM txn WHERE chain_hash IS NOT NULL ${afterFilter}
			ORDER BY created_at ASC, id ASC`;

		let prevHash = startHash;
		for (const row of rows) {
			const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
			const expected = computeChainHash(
				prevHash, row.id, row.from_type, row.from_id,
				row.to_type, row.to_id, row.amount, row.note, createdAt
			);
			if (expected !== row.chain_hash) return { valid: false, invalidAt: row.id };
			prevHash = row.chain_hash;
		}

		return { valid: true };
	}
}
