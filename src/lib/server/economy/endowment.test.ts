import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	calculateAgeYears,
	calculateEndowmentTarget,
	calculateExpectedSupply,
	planProportionalBurn,
	CREDITS_PER_PERSON_YEAR,
	type EndowmentMember,
	type PrincipalBalance
} from './endowment';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const DOB = '2000-01-01';
const DOB_MS = new Date(DOB).getTime();

describe('calculateAgeYears', () => {
	it('returns 0 for null dob', () => {
		assert.equal(calculateAgeYears(null), 0);
	});

	it('returns 0 for invalid date string', () => {
		assert.equal(calculateAgeYears('not-a-date'), 0);
	});

	it('returns floor of elapsed years', () => {
		assert.equal(calculateAgeYears(DOB, DOB_MS + 25 * YEAR_MS), 25);
		assert.equal(calculateAgeYears(DOB, DOB_MS + 25 * YEAR_MS - 1), 24);
	});

	it('returns 0 on birth day', () => {
		assert.equal(calculateAgeYears(DOB, DOB_MS), 0);
	});

	it('returns 0 for future dob (clamped)', () => {
		assert.equal(calculateAgeYears(DOB, DOB_MS - 1), 0);
	});
});

describe('calculateEndowmentTarget', () => {
	it('returns 0 for null dob', () => {
		assert.equal(calculateEndowmentTarget(null), 0);
	});

	it('equals age * CREDITS_PER_PERSON_YEAR', () => {
		const dob = '1980-06-15';
		assert.equal(calculateEndowmentTarget(dob), calculateAgeYears(dob) * CREDITS_PER_PERSON_YEAR);
	});
});

describe('calculateExpectedSupply', () => {
	it('returns 0 for empty member list', () => {
		assert.equal(calculateExpectedSupply([]), 0);
	});

	it('sums endowment targets, treating null dob as 0', () => {
		const members: EndowmentMember[] = [
			{ id: 'p1', dob: '1980-06-15' },
			{ id: 'p2', dob: null }
		];
		const expected = calculateEndowmentTarget('1980-06-15') + 0;
		assert.equal(calculateExpectedSupply(members), expected);
	});
});

describe('planProportionalBurn', () => {
	it('returns empty when no principals have positive balances', () => {
		const result = planProportionalBurn([{ type: 'person', id: 'p1', balance: 0 }], 100);
		assert.deepEqual(result, { deductions: [], burnAmount: 0 });
	});

	it('returns empty when targetBurnAmount is zero or negative', () => {
		const principals: PrincipalBalance[] = [{ type: 'person', id: 'p1', balance: 100 }];
		assert.deepEqual(planProportionalBurn(principals, 0), { deductions: [], burnAmount: 0 });
		assert.deepEqual(planProportionalBurn(principals, -50), { deductions: [], burnAmount: 0 });
	});

	it('caps burn at total available balance', () => {
		const result = planProportionalBurn([{ type: 'person', id: 'p1', balance: 50 }], 100);
		assert.equal(result.burnAmount, 50);
		assert.equal(result.deductions[0].amount, 50);
	});

	it('burns exact amount when sufficient balance exists', () => {
		const result = planProportionalBurn([{ type: 'person', id: 'p1', balance: 200 }], 100);
		assert.equal(result.burnAmount, 100);
		assert.equal(result.deductions[0].amount, 100);
	});

	it('splits proportionally and deductions sum to burnAmount', () => {
		const principals: PrincipalBalance[] = [
			{ type: 'person', id: 'p1', balance: 200 },
			{ type: 'person', id: 'p2', balance: 200 }
		];
		const result = planProportionalBurn(principals, 100);
		assert.equal(result.burnAmount, 100);
		const total = result.deductions.reduce((s, d) => s + d.amount, 0);
		assert.equal(total, 100);
	});

	it('last element absorbs rounding so deductions always sum to burnAmount', () => {
		const principals: PrincipalBalance[] = [
			{ type: 'person', id: 'p1', balance: 100 },
			{ type: 'person', id: 'p2', balance: 200 }
		];
		const result = planProportionalBurn(principals, 30);
		const total = result.deductions.reduce((s, d) => s + d.amount, 0);
		assert.equal(total, result.burnAmount);
	});
});
