import type { EntityType } from '$lib/server/types';
import {
	createTransaction as serviceCreateTransaction,
	validateLedgerTransactionAmount,
	validateLedgerBalanceGuard,
	LedgerTransactionValidationError,
	LEDGER_TRANSACTION_ERROR
} from '$lib/server/services/ledger.service';
import { getRepositories } from '$lib/server/infra/repositories';
import { createRepositories, type Repositories } from '$lib/server/infra/repositories';
import { db } from '$lib/server/infra/db';

type LedgerOnlyRepositories = Pick<Repositories, 'ledger'>;

export type RepositoryTransactionExecutor = <T>(
	work: (repositories: Repositories) => Promise<T>
) => Promise<T>;

export const defaultRepositoryTransactionExecutor: RepositoryTransactionExecutor = async <T>(
	work: (repositories: Repositories) => Promise<T>
): Promise<T> => {
	const result = await db().begin(async (sql) => work(createRepositories(sql)));
	return result as T;
};

export async function runInRepositoryTransaction<T>(
	work: (repositories: Repositories) => Promise<T>,
	executor: RepositoryTransactionExecutor = defaultRepositoryTransactionExecutor
): Promise<T> {
	return executor(work);
}

export async function createLedgerTransaction(params: {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}, repositories?: LedgerOnlyRepositories): Promise<string> {
	if (!repositories) {
		return serviceCreateTransaction(params);
	}

	validateLedgerTransactionAmount(params.amount);

	if (params.fromType === 'system') {
		throw new LedgerTransactionValidationError(
			LEDGER_TRANSACTION_ERROR.SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH,
			'System mint/burn must use explicit system transaction path'
		);
	}

	const availableBalance = await repositories.ledger.calculateBalance(params.fromType, params.fromId);
	validateLedgerBalanceGuard({
		fromType: params.fromType,
		fromId: params.fromId,
		amount: params.amount,
		availableBalance
	});

	return repositories.ledger.createTransaction(params);
}

export async function createSystemLedgerTransaction(params: {
	fromType: 'system';
	fromId: 'mint' | 'burn';
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}, repositories?: LedgerOnlyRepositories): Promise<string> {
	const targetRepositories = repositories ?? getRepositories();

	validateLedgerTransactionAmount(params.amount);

	if (params.fromType !== 'system') {
		throw new LedgerTransactionValidationError(
			LEDGER_TRANSACTION_ERROR.SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH,
			'System transaction path requires fromType=system'
		);
	}

	return targetRepositories.ledger.createTransaction(params);
}
