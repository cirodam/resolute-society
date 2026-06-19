import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	createLedgerTransaction,
	createSystemLedgerTransaction,
	runInRepositoryTransaction,
	type RepositoryTransactionExecutor
} from './transactions';
import {
	LedgerTransactionValidationError,
	LEDGER_TRANSACTION_ERROR
} from '../services/ledger.service';
import type { Repositories } from '$lib/server/infra/repositories';
import type { EntityType } from '$lib/server/types';

// ---------------------------------------------------------------------------
// In-memory ledger with real balance tracking
// ---------------------------------------------------------------------------

function createLedgerRepos(initialBalances: Record<string, number> = {}) {
	const balances = new Map<string, number>(Object.entries(initialBalances));
	const key = (type: string, id: string) => `${type}:${id}`;

	const ledger = {
		calculateBalance: async (type: EntityType, id: string) => balances.get(key(type, id)) ?? 0,
		createTransaction: async (params: {
			fromType: EntityType; fromId: string;
			toType: EntityType; toId: string;
			amount: number; note: string | null;
		}) => {
			const fromKey = key(params.fromType, params.fromId);
			const toKey   = key(params.toType,   params.toId);
			balances.set(fromKey, (balances.get(fromKey) ?? 0) - params.amount);
			balances.set(toKey,   (balances.get(toKey)   ?? 0) + params.amount);
			return 'tx-' + Math.random().toString(36).slice(2);
		}
	};

	const repos = { ledger } as unknown as Repositories;
	const balance = (type: EntityType, id: string) => balances.get(key(type, id)) ?? 0;

	return { repos, balance };
}

// ---------------------------------------------------------------------------
// Transfer matrix — all sender × recipient type combinations
// ---------------------------------------------------------------------------

describe('createLedgerTransaction — sender/recipient matrix', () => {
	const cases: Array<{ from: EntityType; to: EntityType }> = [
		{ from: 'person',      to: 'person'      },
		{ from: 'person',      to: 'association'  },
		{ from: 'person',      to: 'society'      },
		{ from: 'association', to: 'person'        },
		{ from: 'association', to: 'association'   },
		{ from: 'association', to: 'society'       },
		{ from: 'society',     to: 'person'        },
		{ from: 'society',     to: 'association'   },
	];

	for (const { from, to } of cases) {
		it(`transfers from ${from} to ${to}`, async () => {
			const { repos, balance } = createLedgerRepos({
				[`${from}:sender`]: 100,
				[`${to}:receiver`]: 50,
			});

			await createLedgerTransaction(
				{ fromType: from, fromId: 'sender', toType: to, toId: 'receiver', amount: 40, note: null },
				repos
			);

			assert.equal(balance(from, 'sender'),   60);
			assert.equal(balance(to,   'receiver'),  90);
		});
	}

	it('is conserved — sender loss equals receiver gain', async () => {
		const { repos, balance } = createLedgerRepos({ 'person:p1': 200, 'association:a1': 0 });

		await createLedgerTransaction(
			{ fromType: 'person', fromId: 'p1', toType: 'association', toId: 'a1', amount: 75, note: null },
			repos
		);

		assert.equal(balance('person', 'p1') + balance('association', 'a1'), 200);
	});
});

// ---------------------------------------------------------------------------
// Transfer error paths
// ---------------------------------------------------------------------------

describe('createLedgerTransaction — error paths', () => {
	it('rejects insufficient balance before any write', async () => {
		const { repos, balance } = createLedgerRepos({ 'person:p1': 5 });

		await assert.rejects(
			() => createLedgerTransaction(
				{ fromType: 'person', fromId: 'p1', toType: 'person', toId: 'p2', amount: 10, note: null },
				repos
			),
			(err: unknown) =>
				err instanceof LedgerTransactionValidationError &&
				err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE
		);

		assert.equal(balance('person', 'p1'), 5, 'sender balance unchanged after rejection');
	});

	it('rejects zero amount', async () => {
		const { repos } = createLedgerRepos({ 'person:p1': 100 });

		await assert.rejects(
			() => createLedgerTransaction(
				{ fromType: 'person', fromId: 'p1', toType: 'person', toId: 'p2', amount: 0, note: null },
				repos
			),
			(err: unknown) =>
				err instanceof LedgerTransactionValidationError &&
				err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
	});

	it('rejects negative amount', async () => {
		const { repos } = createLedgerRepos({ 'person:p1': 100 });

		await assert.rejects(
			() => createLedgerTransaction(
				{ fromType: 'person', fromId: 'p1', toType: 'person', toId: 'p2', amount: -1, note: null },
				repos
			),
			(err: unknown) =>
				err instanceof LedgerTransactionValidationError &&
				err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
	});

	it('rejects system as sender (must use system path)', async () => {
		const { repos } = createLedgerRepos();

		await assert.rejects(
			() => createLedgerTransaction(
				{ fromType: 'system' as EntityType, fromId: 'mint', toType: 'society', toId: 's1', amount: 1, note: null },
				repos
			),
			(err: unknown) =>
				err instanceof LedgerTransactionValidationError &&
				err.code === LEDGER_TRANSACTION_ERROR.SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH
		);
	});

	it('accepts exact-balance transfer (boundary)', async () => {
		const { repos, balance } = createLedgerRepos({ 'person:p1': 50 });

		await createLedgerTransaction(
			{ fromType: 'person', fromId: 'p1', toType: 'person', toId: 'p2', amount: 50, note: null },
			repos
		);

		assert.equal(balance('person', 'p1'), 0);
		assert.equal(balance('person', 'p2'), 50);
	});
});

// ---------------------------------------------------------------------------
// Demurrage burn path (regular transfer → system:burn)
// ---------------------------------------------------------------------------

describe('createLedgerTransaction — demurrage burn', () => {
	it('person balance reduced when burned to system', async () => {
		const { repos, balance } = createLedgerRepos({ 'person:p1': 100 });

		await createLedgerTransaction(
			{ fromType: 'person', fromId: 'p1', toType: 'system', toId: 'burn', amount: 10, note: 'demurrage' },
			repos
		);

		assert.equal(balance('person', 'p1'),  90);
		assert.equal(balance('system', 'burn'), 10);
	});

	it('association balance reduced when burned to system', async () => {
		const { repos, balance } = createLedgerRepos({ 'association:a1': 80 });

		await createLedgerTransaction(
			{ fromType: 'association', fromId: 'a1', toType: 'system', toId: 'burn', amount: 8, note: 'demurrage' },
			repos
		);

		assert.equal(balance('association', 'a1'), 72);
	});
});

// ---------------------------------------------------------------------------
// System mint path (createSystemLedgerTransaction)
// ---------------------------------------------------------------------------

describe('createSystemLedgerTransaction', () => {
	it('mints credits to society treasury', async () => {
		const { repos, balance } = createLedgerRepos({ 'society:soc-1': 0 });

		await createSystemLedgerTransaction(
			{ fromType: 'system', fromId: 'mint', toType: 'society', toId: 'soc-1', amount: 500, note: 'endowment' },
			repos
		);

		assert.equal(balance('society', 'soc-1'), 500);
	});

	it('mints credits to a person', async () => {
		const { repos, balance } = createLedgerRepos({ 'person:p1': 0 });

		await createSystemLedgerTransaction(
			{ fromType: 'system', fromId: 'mint', toType: 'person', toId: 'p1', amount: 100, note: 'payroll' },
			repos
		);

		assert.equal(balance('person', 'p1'), 100);
	});

	it('rejects zero amount', async () => {
		const { repos } = createLedgerRepos();

		await assert.rejects(
			() => createSystemLedgerTransaction(
				{ fromType: 'system', fromId: 'mint', toType: 'society', toId: 's1', amount: 0, note: null },
				repos
			),
			(err: unknown) =>
				err instanceof LedgerTransactionValidationError &&
				err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
	});
});

// ---------------------------------------------------------------------------
// Repository transaction executor
// ---------------------------------------------------------------------------

describe('repository transaction executor', () => {
	function createInMemoryExecutor() {
		const committed: string[] = [];

		const executor: RepositoryTransactionExecutor = async (work) => {
			const staged = [...committed];
			const repos = {
				ledger: {
					calculateBalance: async () => 999,
					createTransaction: async (params: { toId: string }) => {
						staged.push(params.toId);
						return params.toId;
					}
				}
			} as unknown as Repositories;

			const result = await work(repos);
			committed.splice(0, committed.length, ...staged);
			return result;
		};

		return { executor, committed };
	}

	it('rolls back staged writes on injected failure', async () => {
		const { executor, committed } = createInMemoryExecutor();

		await assert.rejects(async () => {
			await runInRepositoryTransaction(async (repositories) => {
				await repositories.ledger.createTransaction({ toId: 'a' } as never);
				await repositories.ledger.createTransaction({ toId: 'b' } as never);
				throw new Error('injected failure');
			}, executor);
		});

		assert.deepEqual(committed, []);
	});

	it('commits all writes when batch succeeds', async () => {
		const { executor, committed } = createInMemoryExecutor();

		await runInRepositoryTransaction(async (repositories) => {
			await repositories.ledger.createTransaction({ toId: 'a' } as never);
			await repositories.ledger.createTransaction({ toId: 'b' } as never);
		}, executor);

		assert.deepEqual(committed, ['a', 'b']);
	});
});
