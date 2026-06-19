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
