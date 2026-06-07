import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrincipalAddress } from './addressing';

const SOCIETY_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID  = '22222222-2222-2222-2222-222222222222';

test('parsePrincipalAddress parses treasury addresses', () => {
	assert.deepEqual(parsePrincipalAddress(`treasury@${SOCIETY_ID}`), {
		kind: 'treasury',
		societyId: SOCIETY_ID
	});
});

test('parsePrincipalAddress parses member addresses', () => {
	assert.deepEqual(parsePrincipalAddress(`${PERSON_ID}@${SOCIETY_ID}`), {
		kind: 'member',
		personId: PERSON_ID,
		societyId: SOCIETY_ID
	});
});

test('parsePrincipalAddress rejects malformed addresses', () => {
	assert.equal(parsePrincipalAddress(''), null);
	assert.equal(parsePrincipalAddress('   '), null);
	assert.equal(parsePrincipalAddress(`@${SOCIETY_ID}`), null);
	assert.equal(parsePrincipalAddress(`${PERSON_ID}@`), null);
	assert.equal(parsePrincipalAddress(`${PERSON_ID}@${SOCIETY_ID}@extra`), null);
	// handle-based addresses are no longer valid
	assert.equal(parsePrincipalAddress('alice@west-philly-mas'), null);
	assert.equal(parsePrincipalAddress(`alice@${SOCIETY_ID}`), null);
	assert.equal(parsePrincipalAddress('alice'), null);
});
