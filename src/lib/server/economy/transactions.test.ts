import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	createSystemLedgerTransaction,
	runInRepositoryTransaction,
	type RepositoryTransactionExecutor
} from './transactions';
import {
	LedgerTransactionValidationError,
	LEDGER_TRANSACTION_ERROR
} from '../services/ledger.service';
import type { Repositories } from '$lib/server/infra/repositories';

describe('system transaction path', () => {
	it('rejects invalid non-system source before repository write', async () => {
		await assert.rejects(
			() =>
				createSystemLedgerTransaction({
					fromType: 'person' as unknown as 'system',
					fromId: 'mint',
					toType: 'society',
					toId: 'soc-1',
					amount: 1,
					note: 'invalid'
				}),
			(error: unknown) =>
				error instanceof LedgerTransactionValidationError &&
				error.code === LEDGER_TRANSACTION_ERROR.SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH
		);
	});
});

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
