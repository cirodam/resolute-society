import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	validateLedgerTransactionAmount,
	validateLedgerBalanceGuard,
	LedgerTransactionValidationError,
	LEDGER_TRANSACTION_ERROR
} from './ledger.service';

describe('ledger transaction validation', () => {
	it('rejects non-positive and non-finite amounts', () => {
		assert.throws(
			() => validateLedgerTransactionAmount(0),
			(error: unknown) =>
				error instanceof LedgerTransactionValidationError &&
				error.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
		assert.throws(
			() => validateLedgerTransactionAmount(-5),
			(error: unknown) =>
				error instanceof LedgerTransactionValidationError &&
				error.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
		assert.throws(
			() => validateLedgerTransactionAmount(Number.NaN),
			(error: unknown) =>
				error instanceof LedgerTransactionValidationError &&
				error.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT
		);
	});

	it('accepts positive finite amounts', () => {
		assert.doesNotThrow(() => validateLedgerTransactionAmount(0.01));
	});

	it('rejects insufficient balance consistently', () => {
		assert.throws(
			() =>
				validateLedgerBalanceGuard({
					fromType: 'person',
					fromId: 'person-1',
					amount: 10,
					availableBalance: 9.99
				}),
			(error: unknown) =>
				error instanceof LedgerTransactionValidationError &&
				error.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE
		);
	});

	it('accepts transfers when available balance covers amount', () => {
		assert.doesNotThrow(() =>
			validateLedgerBalanceGuard({
				fromType: 'association',
				fromId: 'assoc-1',
				amount: 10,
				availableBalance: 10
			})
		);
	});
});
