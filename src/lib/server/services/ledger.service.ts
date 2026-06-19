import { getRepositories } from '../infra/repositories';
import type { Repositories } from '../infra/repositories';
import type { EntityType } from '$lib/server/types';

export type { EntityType } from '$lib/server/types';

export const LEDGER_TRANSACTION_ERROR = {
	NON_POSITIVE_AMOUNT: 'NON_POSITIVE_AMOUNT',
	INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
	SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH: 'SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH'
} as const;

export type LedgerTransactionErrorCode =
	(typeof LEDGER_TRANSACTION_ERROR)[keyof typeof LEDGER_TRANSACTION_ERROR];

export class LedgerTransactionValidationError extends Error {
	constructor(
		public readonly code: LedgerTransactionErrorCode,
		message: string
	) {
		super(message);
		this.name = 'LedgerTransactionValidationError';
	}
}

export function validateLedgerTransactionAmount(amount: number): void {
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new LedgerTransactionValidationError(
			LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT,
			'Amount must be greater than zero'
		);
	}
}

export function validateLedgerBalanceGuard(params: {
	fromType: EntityType;
	fromId: string;
	amount: number;
	availableBalance: number;
}): void {
	if (params.availableBalance < params.amount) {
		throw new LedgerTransactionValidationError(
			LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE,
			`Insufficient balance: ${params.fromType} ${params.fromId} has less than ${params.amount} credits`
		);
	}
}

export async function calculateBalance(
	entityType: EntityType,
	entityId: string,
	repositories: Pick<Repositories, 'ledger'> = getRepositories()
): Promise<number> {
	return repositories.ledger.calculateBalance(entityType, entityId);
}

// Validated path for peer-to-peer transfers only. Do NOT use for minting (system/mint has no
// real balance and will always fail the check). Mint/burn must use
// createSystemLedgerTransaction in src/lib/server/economy/transactions.ts.
export async function createTransaction(params: {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}, repositories: Pick<Repositories, 'ledger'> = getRepositories()): Promise<string> {
	validateLedgerTransactionAmount(params.amount);

	if (params.fromType === 'system') {
		throw new LedgerTransactionValidationError(
			LEDGER_TRANSACTION_ERROR.SYSTEM_TRANSACTION_REQUIRES_EXPLICIT_PATH,
			'System mint/burn must use explicit system transaction path'
		);
	}

	const availableBalance = await calculateBalance(params.fromType, params.fromId, repositories);
	validateLedgerBalanceGuard({
		fromType: params.fromType,
		fromId: params.fromId,
		amount: params.amount,
		availableBalance
	});

	return repositories.ledger.createTransaction(params);
}
