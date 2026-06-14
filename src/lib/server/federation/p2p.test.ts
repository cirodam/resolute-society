import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isSameSocietyTransfer, parseSocietyHandle } from './p2p';

describe('federation principal parsing', () => {
	it('extracts society handle from valid principal', () => {
		assert.equal(parseSocietyHandle('treasury@test-society'), 'test-society');
		assert.equal(parseSocietyHandle('alice@test-society'), 'test-society');
	});

	it('rejects malformed principals', () => {
		assert.equal(parseSocietyHandle('alice'), null);
		assert.equal(parseSocietyHandle('@test-society'), null);
		assert.equal(parseSocietyHandle('alice@'), null);
	});

	it('detects same-society transfers', () => {
		assert.equal(isSameSocietyTransfer('treasury@test-society', 'alice@test-society'), true);
		assert.equal(isSameSocietyTransfer('alice@test-society', 'bob@other-society'), false);
		assert.equal(isSameSocietyTransfer('invalid', 'bob@test-society'), false);
	});
});
