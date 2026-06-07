import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parsePrincipalAddress } from './addressing';
import { isValidPositiveAmount } from './disbursement';
import { planDemurrageDeductions, type PrincipalBalance } from './demurrage';

describe('economy invariants', () => {
	it('address parsing is deterministic and unambiguous', () => {
		const societyId = '11111111-1111-1111-1111-111111111111';
		const input = `treasury@${societyId}`;
		const first = parsePrincipalAddress(input);
		const second = parsePrincipalAddress(input);

		assert.deepEqual(first, second);
		assert.deepEqual(first, { kind: 'treasury', societyId });
		assert.equal(parsePrincipalAddress('treasury@@other'), null);
	});

	it('positive amount validation rejects non-positive and non-finite values', () => {
		assert.equal(isValidPositiveAmount(1), true);
		assert.equal(isValidPositiveAmount(0), false);
		assert.equal(isValidPositiveAmount(-2), false);
		assert.equal(isValidPositiveAmount(Number.NaN), false);
		assert.equal(isValidPositiveAmount(Number.POSITIVE_INFINITY), false);
	});

	it('demurrage only charges principals with positive balances', () => {
		const principals: PrincipalBalance[] = [
			{ type: 'person', id: 'p1', balance: 0 },
			{ type: 'association', id: 'a1', balance: -4 },
			{ type: 'society', id: 's1', balance: 9 },
			{ type: 'person', id: 'p2', balance: 3 }
		];

		const deductions = planDemurrageDeductions(principals, 'flat', 2);
		assert.equal(deductions.length, 2);
		assert.deepEqual(deductions, [
			{ type: 'society', id: 's1', amount: 2 },
			{ type: 'person', id: 'p2', amount: 2 }
		]);
	});
});
