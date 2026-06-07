import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseSex } from './form.util';

describe('parseSex', () => {
	it('returns null for null input', () => {
		assert.equal(parseSex(null), null);
	});

	it('returns null for empty or whitespace-only string', () => {
		assert.equal(parseSex(''), null);
		assert.equal(parseSex('   '), null);
	});

	it('accepts valid values', () => {
		assert.equal(parseSex('male'), 'male');
		assert.equal(parseSex('female'), 'female');
		assert.equal(parseSex('other'), 'other');
	});

	it('rejects unrecognised values', () => {
		assert.equal(parseSex('nonbinary'), 'invalid');
		assert.equal(parseSex('unknown'), 'invalid');
	});

	it('is case-sensitive', () => {
		assert.equal(parseSex('Male'), 'invalid');
		assert.equal(parseSex('MALE'), 'invalid');
		assert.equal(parseSex('Female'), 'invalid');
	});
});
