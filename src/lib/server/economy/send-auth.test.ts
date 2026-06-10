import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeFromPrincipal, parsePrincipalRef } from './send-auth';

test('parsePrincipalRef parses valid principal', () => {
	assert.deepEqual(parsePrincipalRef('abc@soc-1'), {
		id: 'abc',
		societyId: 'soc-1'
	});
});

test('parsePrincipalRef rejects malformed principal', () => {
	assert.equal(parsePrincipalRef('abc'), null);
	assert.equal(parsePrincipalRef('abc@@soc-1'), null);
	assert.equal(parsePrincipalRef('@soc-1'), null);
	assert.equal(parsePrincipalRef('abc@'), null);
});

test('authorizeFromPrincipal rejects unauthenticated sender', () => {
	const result = authorizeFromPrincipal({
		requestedFromPrincipal: 'person-1@soc-1',
		authenticatedPersonId: undefined,
		societyId: 'soc-1',
		canTransferFromTreasury: false
	});

	assert.deepEqual(result, {
		ok: false,
		status: 401,
		sendError: 'Not authenticated'
	});
});

test('authorizeFromPrincipal rejects person mismatch', () => {
	const result = authorizeFromPrincipal({
		requestedFromPrincipal: 'person-2@soc-1',
		authenticatedPersonId: 'person-1',
		societyId: 'soc-1',
		canTransferFromTreasury: false
	});

	assert.deepEqual(result, {
		ok: false,
		status: 403,
		sendError: 'Cannot send on behalf of another principal'
	});
});

test('authorizeFromPrincipal rejects treasury send without permission', () => {
	const result = authorizeFromPrincipal({
		requestedFromPrincipal: 'treasury@soc-1',
		authenticatedPersonId: 'person-1',
		societyId: 'soc-1',
		canTransferFromTreasury: false
	});

	assert.deepEqual(result, {
		ok: false,
		status: 403,
		sendError: 'Permission denied: treasury.transfer'
	});
});

test('authorizeFromPrincipal allows treasury send with permission', () => {
	const result = authorizeFromPrincipal({
		requestedFromPrincipal: 'treasury@soc-1',
		authenticatedPersonId: 'person-1',
		societyId: 'soc-1',
		canTransferFromTreasury: true
	});

	assert.deepEqual(result, {
		ok: true,
		effectiveFromPrincipal: 'treasury@soc-1',
		fromId: 'treasury',
		fromSocietyId: 'soc-1'
	});
});

test('authorizeFromPrincipal allows authenticated self principal', () => {
	const result = authorizeFromPrincipal({
		requestedFromPrincipal: 'person-1@soc-1',
		authenticatedPersonId: 'person-1',
		societyId: 'soc-1',
		canTransferFromTreasury: false
	});

	assert.deepEqual(result, {
		ok: true,
		effectiveFromPrincipal: 'person-1@soc-1',
		fromId: 'person-1',
		fromSocietyId: 'soc-1'
	});
});
