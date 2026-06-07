import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	calculateDemurrageAmount,
	planDemurrageDeductions,
	type PrincipalBalance
} from './demurrage';

describe('calculateDemurrageAmount', () => {
	it('calculates percent deductions from positive balances', () => {
		assert.equal(calculateDemurrageAmount(200, 'percent', 5), 10);
	});

	it('caps flat deductions at current balance', () => {
		assert.equal(calculateDemurrageAmount(3, 'flat', 10), 3);
	});

	it('returns zero for non-positive balance or value', () => {
		assert.equal(calculateDemurrageAmount(0, 'flat', 1), 0);
		assert.equal(calculateDemurrageAmount(100, 'flat', 0), 0);
	});
});

describe('planDemurrageDeductions', () => {
	it('creates deductions for all supported principal types', () => {
		const principals: PrincipalBalance[] = [
			{ type: 'person', id: 'p1', balance: 100 },
			{ type: 'association', id: 'a1', balance: 40 },
			{ type: 'society', id: 's1', balance: 80 },
			{ type: 'system', id: 'sys1', balance: 20 }
		];

		const deductions = planDemurrageDeductions(principals, 'flat', 10);

		assert.deepEqual(deductions, [
			{ type: 'person', id: 'p1', amount: 10 },
			{ type: 'association', id: 'a1', amount: 10 },
			{ type: 'society', id: 's1', amount: 10 },
			{ type: 'system', id: 'sys1', amount: 10 }
		]);
	});

	it('skips principals with no positive deductions', () => {
		const principals: PrincipalBalance[] = [
			{ type: 'person', id: 'p1', balance: 0 },
			{ type: 'association', id: 'a1', balance: -5 },
			{ type: 'society', id: 's1', balance: 10 }
		];

		const deductions = planDemurrageDeductions(principals, 'percent', 10);

		assert.deepEqual(deductions, [{ type: 'society', id: 's1', amount: 1 }]);
	});
});
