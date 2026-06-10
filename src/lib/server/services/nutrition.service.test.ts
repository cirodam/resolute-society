import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveProfileIds, accumulateRequirements } from './nutrition.service';
import type { DriProfileRow, DriValueRow } from '$lib/server/infra/repositories/nutrition.repository';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function profile(id: string, ageMin: number, ageMax: number, sex: DriProfileRow['sex']): DriProfileRow {
	return { id, age_min: ageMin, age_max: ageMax, sex, label: id };
}

function driValue(profileId: string, nutrientId: string, amount: number): DriValueRow {
	return { profile_id: profileId, nutrient_id: nutrientId, amount };
}

const profiles: DriProfileRow[] = [
	profile('child-any',   0,  12, 'any'),
	profile('teen-male',  13,  17, 'male'),
	profile('teen-female',13,  17, 'female'),
	profile('adult-any',  18,  64, 'any'),
	profile('senior-any', 65, 120, 'any'),
];

// ---------------------------------------------------------------------------
// resolveProfileIds
// ---------------------------------------------------------------------------

describe('resolveProfileIds', () => {
	it('returns the sex-specific profile when available', () => {
		const ids = resolveProfileIds(15, 'male', profiles);
		assert.deepEqual(ids, ['teen-male']);
	});

	it('returns female profile for female sex', () => {
		const ids = resolveProfileIds(15, 'female', profiles);
		assert.deepEqual(ids, ['teen-female']);
	});

	it('falls back to any-sex profile when exact sex not found', () => {
		// adult-any covers 18-64 without sex split
		const ids = resolveProfileIds(30, 'male', profiles);
		assert.deepEqual(ids, ['adult-any']);
	});

	it('returns any-sex profile for sex=other', () => {
		const ids = resolveProfileIds(8, 'other', profiles);
		assert.deepEqual(ids, ['child-any']);
	});

	it('returns any-sex profile for sex=null', () => {
		const ids = resolveProfileIds(70, null, profiles);
		assert.deepEqual(ids, ['senior-any']);
	});

	it('returns both male and female profiles for sex=other when no any-sex exists', () => {
		const noAny: DriProfileRow[] = [
			profile('teen-male',   13, 17, 'male'),
			profile('teen-female', 13, 17, 'female'),
		];
		const ids = resolveProfileIds(15, 'other', noAny);
		assert.deepEqual(ids.sort(), ['teen-female', 'teen-male']);
	});

	it('returns empty array when no profile covers the age', () => {
		const ids = resolveProfileIds(200, 'male', profiles);
		assert.deepEqual(ids, []);
	});
});

// ---------------------------------------------------------------------------
// accumulateRequirements
// ---------------------------------------------------------------------------

describe('accumulateRequirements', () => {
	const driValues: DriValueRow[] = [
		driValue('adult-any', 'vitamin-c', 90),
		driValue('adult-any', 'calcium',  1000),
		driValue('teen-male', 'vitamin-c', 75),
	];

	it('adds DRI values for a matched single profile', () => {
		const totals = new Map<string, number>();
		accumulateRequirements(totals, ['adult-any'], driValues);
		assert.equal(totals.get('vitamin-c'), 90);
		assert.equal(totals.get('calcium'),   1000);
	});

	it('accumulates across multiple calls (population summing)', () => {
		const totals = new Map<string, number>();
		accumulateRequirements(totals, ['adult-any'], driValues);
		accumulateRequirements(totals, ['adult-any'], driValues);
		assert.equal(totals.get('vitamin-c'), 180);
		assert.equal(totals.get('calcium'),   2000);
	});

	it('averages when two profiles are returned (male+female averaging)', () => {
		const values: DriValueRow[] = [
			driValue('teen-male',   'iron', 11),
			driValue('teen-female', 'iron', 15),
		];
		const totals = new Map<string, number>();
		accumulateRequirements(totals, ['teen-male', 'teen-female'], values);
		// (11/2) + (15/2) = 13
		assert.equal(totals.get('iron'), 13);
	});

	it('does nothing when profileIds is empty', () => {
		const totals = new Map<string, number>();
		accumulateRequirements(totals, [], driValues);
		assert.equal(totals.size, 0);
	});

	it('ignores DRI values for non-matching profiles', () => {
		const totals = new Map<string, number>();
		accumulateRequirements(totals, ['teen-male'], driValues);
		assert.equal(totals.get('vitamin-c'), 75);
		assert.equal(totals.has('calcium'),   false);
	});
});
