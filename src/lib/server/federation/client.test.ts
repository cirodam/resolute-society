import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	isPrincipalNotFound,
	readMetaFromFailure,
	type FederationReadMeta
} from './client';
import type { ExternalFetchFailure } from '$lib/server/http/external-fetch';

describe('federation read degradation semantics', () => {
	it('maps timeout failures to degraded timeout reason', () => {
		const failure: ExternalFetchFailure = {
			ok: false,
			kind: 'timeout',
			attempts: 1
		};
		const meta: FederationReadMeta = readMetaFromFailure(failure);
		assert.equal(meta.degraded, true);
		assert.equal(meta.reason, 'timeout');
		assert.equal(meta.status, null);
		assert.equal(meta.attempts, 1);
	});

	it('maps network failures to degraded network reason', () => {
		const failure: ExternalFetchFailure = {
			ok: false,
			kind: 'network',
			attempts: 2
		};
		const meta: FederationReadMeta = readMetaFromFailure(failure);
		assert.equal(meta.degraded, true);
		assert.equal(meta.reason, 'network');
		assert.equal(meta.attempts, 2);
	});

	it('maps upstream failures to degraded upstream reason and preserves status', () => {
		const failure: ExternalFetchFailure = {
			ok: false,
			kind: 'upstream',
			attempts: 1,
			status: 503,
			response: new Response('unavailable', { status: 503 })
		};
		const meta: FederationReadMeta = readMetaFromFailure(failure);
		assert.equal(meta.degraded, true);
		assert.equal(meta.reason, 'upstream');
		assert.equal(meta.status, 503);
	});

	it('detects principal-not-found as non-degraded zero condition', () => {
		assert.equal(isPrincipalNotFound(404, 'Principal not found'), true);
		assert.equal(isPrincipalNotFound(404, 'principal not found for handle'), true);
		assert.equal(isPrincipalNotFound(404, 'different error'), false);
		assert.equal(isPrincipalNotFound(500, 'principal not found'), false);
		assert.equal(isPrincipalNotFound(undefined, 'principal not found'), false);
	});
});
