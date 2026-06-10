import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { requiredRunAnchor } from './scheduler.service';

// The scheduler fires at 08:00 local time. A job is "due" if it hasn't run
// since the most recent 08:00 anchor. These tests pin that date logic.
// Comparisons use local-time getters (not toISOString) so tests are
// timezone-agnostic.

function localDate(year: number, month: number, day: number, hours: number, minutes = 0): Date {
	return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

describe('requiredRunAnchor', () => {
	it('returns today 08:00 when current time is after 08:00', () => {
		const now    = localDate(2026, 6, 10, 9);
		const anchor = requiredRunAnchor(now);
		assert.equal(anchor.getFullYear(), 2026);
		assert.equal(anchor.getMonth(),    5); // 0-indexed June
		assert.equal(anchor.getDate(),    10);
		assert.equal(anchor.getHours(),    8);
		assert.equal(anchor.getMinutes(),  0);
	});

	it('returns today 08:00 when current time is exactly 08:00', () => {
		const now    = localDate(2026, 6, 10, 8, 0);
		const anchor = requiredRunAnchor(now);
		assert.equal(anchor.getDate(),  10);
		assert.equal(anchor.getHours(),  8);
		assert.equal(anchor.getMinutes(), 0);
	});

	it('returns yesterday 08:00 when current time is before 08:00', () => {
		const now    = localDate(2026, 6, 10, 3);
		const anchor = requiredRunAnchor(now);
		assert.equal(anchor.getDate(),   9);
		assert.equal(anchor.getHours(),  8);
		assert.equal(anchor.getMinutes(), 0);
	});

	it('returns yesterday 08:00 at 07:59 (one minute before cutover)', () => {
		const now    = localDate(2026, 6, 10, 7, 59);
		const anchor = requiredRunAnchor(now);
		assert.equal(anchor.getDate(),   9);
		assert.equal(anchor.getHours(),  8);
		assert.equal(anchor.getMinutes(), 0);
	});

	it('anchor is always at 08:00:00.000', () => {
		const now    = localDate(2026, 6, 10, 15, 30);
		const anchor = requiredRunAnchor(now);
		assert.equal(anchor.getHours(),        8);
		assert.equal(anchor.getMinutes(),      0);
		assert.equal(anchor.getSeconds(),      0);
		assert.equal(anchor.getMilliseconds(), 0);
	});
});
