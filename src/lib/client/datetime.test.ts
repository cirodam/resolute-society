import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { formatShortDate, formatLongDate, formatTime, formatDateTime, formatDateRange } from './datetime';

describe('formatShortDate', () => {
	it('returns fallback for null', () => {
		assert.equal(formatShortDate(null), 'Unknown');
		assert.equal(formatShortDate(null, 'N/A'), 'N/A');
	});

	it('returns fallback for invalid date string', () => {
		assert.equal(formatShortDate('not-a-date'), 'Unknown');
		assert.equal(formatShortDate('not-a-date', 'N/A'), 'N/A');
	});

	it('returns fallback for invalid Date object', () => {
		assert.equal(formatShortDate(new Date('invalid')), 'Unknown');
	});

	it('formats a Date object', () => {
		const result = formatShortDate(new Date(2024, 0, 15)); // Jan 15 local
		assert.ok(result.includes('2024'), `expected 2024 in "${result}"`);
		assert.ok(result.includes('Jan'), `expected Jan in "${result}"`);
		assert.ok(result.includes('15'), `expected 15 in "${result}"`);
	});

	it('does not shift day for YYYY-MM-DD strings (timezone bug guard)', () => {
		// new Date("2024-01-15") is UTC midnight — would show Jan 14 in UTC- zones.
		// formatShortDate must reparse as local midnight.
		const result = formatShortDate('2024-01-15');
		assert.ok(result.includes('15'), `date-only string shifted day: got "${result}"`);
		assert.ok(result.includes('2024'), `expected 2024 in "${result}"`);
	});
});

describe('formatLongDate', () => {
	it('returns fallback for null', () => {
		assert.equal(formatLongDate(null), 'Unknown');
	});

	it('uses long month name', () => {
		const result = formatLongDate('2024-06-01');
		assert.ok(result.includes('June'), `expected "June" in "${result}"`);
	});
});

describe('formatTime', () => {
	it('returns fallback for null', () => {
		assert.equal(formatTime(null), 'Unknown');
		assert.equal(formatTime(null, 'N/A'), 'N/A');
	});

	it('returns fallback for invalid date string', () => {
		assert.equal(formatTime('garbage'), 'Unknown');
	});

	it('formats time from a Date object', () => {
		const d = new Date(2024, 0, 15, 14, 30); // 2:30 PM local
		const result = formatTime(d);
		assert.ok(result.includes('30'), `expected minutes in "${result}"`);
	});
});

describe('formatDateTime', () => {
	it('returns fallback for null', () => {
		assert.equal(formatDateTime(null), 'Unknown');
	});

	it('includes both date and time parts', () => {
		const d = new Date(2024, 0, 15, 9, 5);
		const result = formatDateTime(d);
		assert.ok(result.includes('2024'), `expected year in "${result}"`);
		assert.ok(result.includes('05'), `expected minutes in "${result}"`);
	});
});

describe('formatDateRange', () => {
	it('formats two dates with an em dash', () => {
		const result = formatDateRange('2024-01-01', '2024-01-31');
		assert.ok(result.includes('—'), `expected em dash in "${result}"`);
	});

	it('uses fallback when dates are null', () => {
		const result = formatDateRange(null, null);
		assert.equal(result, 'Unknown — Unknown');
	});

	it('accepts a custom formatter', () => {
		const result = formatDateRange('2024-01-01', '2024-12-31', () => 'X');
		assert.equal(result, 'X — X');
	});
});
