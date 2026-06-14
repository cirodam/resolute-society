import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAddress, parsePrincipalAddress } from './addressing';

// resolveAddress requires DB access and is covered by integration tests.

const SOCIETY_ID = '11111111-1111-1111-1111-111111111111';
const PERSON_ID  = '22222222-2222-2222-2222-222222222222';

// --- parseAddress ---

test('parseAddress: handle/qualified', () => {
	assert.deepEqual(parseAddress('alice@athensga'), { form: 'handle', kind: 'qualified', local: 'alice', society: 'athensga' });
	assert.deepEqual(parseAddress('treasury@athensga'), { form: 'handle', kind: 'qualified', local: 'treasury', society: 'athensga' });
	assert.deepEqual(parseAddress('firstbaptist@north-ga'), { form: 'handle', kind: 'qualified', local: 'firstbaptist', society: 'north-ga' });
});

test('parseAddress: handle/qualified normalizes case', () => {
	assert.deepEqual(parseAddress('Alice@AthensGA'), { form: 'handle', kind: 'qualified', local: 'alice', society: 'athensga' });
});

test('parseAddress: handle/bare', () => {
	assert.deepEqual(parseAddress('alice'), { form: 'handle', kind: 'bare', handle: 'alice' });
	assert.deepEqual(parseAddress('athensga'), { form: 'handle', kind: 'bare', handle: 'athensga' });
	assert.deepEqual(parseAddress('treasury'), { form: 'handle', kind: 'bare', handle: 'treasury' });
	assert.deepEqual(parseAddress('north-ga'), { form: 'handle', kind: 'bare', handle: 'north-ga' });
});

test('parseAddress: ref/qualified', () => {
	assert.deepEqual(parseAddress(`treasury@${SOCIETY_ID}`), { form: 'ref', kind: 'qualified', local: 'treasury', societyId: SOCIETY_ID });
	assert.deepEqual(parseAddress(`${PERSON_ID}@${SOCIETY_ID}`), { form: 'ref', kind: 'qualified', local: PERSON_ID, societyId: SOCIETY_ID });
});

test('parseAddress: ref/bare', () => {
	assert.deepEqual(parseAddress(SOCIETY_ID), { form: 'ref', kind: 'bare', societyId: SOCIETY_ID });
});

test('parseAddress: invalid — empty', () => {
	assert.deepEqual(parseAddress(''), { form: 'invalid', reason: 'empty' });
	assert.deepEqual(parseAddress('   '), { form: 'invalid', reason: 'empty' });
});

test('parseAddress: invalid — multiple @', () => {
	assert.deepEqual(parseAddress('a@b@c'), { form: 'invalid', reason: 'multiple-at' });
	assert.deepEqual(parseAddress(`${PERSON_ID}@${SOCIETY_ID}@extra`), { form: 'invalid', reason: 'multiple-at' });
});

test('parseAddress: invalid — empty local or domain', () => {
	assert.deepEqual(parseAddress(`@${SOCIETY_ID}`), { form: 'invalid', reason: 'empty-local' });
	assert.deepEqual(parseAddress('@athensga'), { form: 'invalid', reason: 'empty-local' });
	assert.deepEqual(parseAddress(`${PERSON_ID}@`), { form: 'invalid', reason: 'empty-domain' });
	assert.deepEqual(parseAddress('alice@'), { form: 'invalid', reason: 'empty-domain' });
});

test('parseAddress: invalid — bad token', () => {
	// handle local against UUID domain is not a valid form
	assert.deepEqual(parseAddress(`alice@${SOCIETY_ID}`), { form: 'invalid', reason: 'invalid-token' });
	// invalid characters
	assert.deepEqual(parseAddress('ali ce@athensga'), { form: 'invalid', reason: 'invalid-token' });
	assert.deepEqual(parseAddress('alice@athens!ga'), { form: 'invalid', reason: 'invalid-token' });
});

// --- parsePrincipalAddress (unchanged — reads stored Principal References) ---

test('parsePrincipalAddress: parses treasury ref', () => {
	assert.deepEqual(parsePrincipalAddress(`treasury@${SOCIETY_ID}`), { kind: 'treasury', societyId: SOCIETY_ID });
});

test('parsePrincipalAddress: parses member ref', () => {
	assert.deepEqual(parsePrincipalAddress(`${PERSON_ID}@${SOCIETY_ID}`), { kind: 'member', personId: PERSON_ID, societyId: SOCIETY_ID });
});

test('parsePrincipalAddress: rejects non-ref input', () => {
	assert.equal(parsePrincipalAddress(''), null);
	assert.equal(parsePrincipalAddress('alice@athensga'), null);
	assert.equal(parsePrincipalAddress('alice'), null);
	assert.equal(parsePrincipalAddress(`alice@${SOCIETY_ID}`), null);
	assert.equal(parsePrincipalAddress(`${PERSON_ID}@`), null);
	assert.equal(parsePrincipalAddress(`@${SOCIETY_ID}`), null);
	assert.equal(parsePrincipalAddress(`${PERSON_ID}@${SOCIETY_ID}@extra`), null);
});
