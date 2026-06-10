import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { error, fail } from '@sveltejs/kit';

import { failCritical, withCriticalAction } from './critical-action';

describe('critical action error contract', () => {
	it('normalizes validation failures', async () => {
		const wrapped = withCriticalAction(async () => {
			return fail(400, { sendError: 'To principal is required' });
		});

		const result = (await wrapped()) as any;
		assert.equal(result.status, 400);
		assert.equal(result.data.errorCode, 'VALIDATION_FAILED');
		assert.equal(result.data.errorCategory, 'validation');
		assert.equal(result.data.actionError.message, 'To principal is required');
	});

	it('normalizes permission exceptions', async () => {
		const wrapped = withCriticalAction(async () => {
			throw error(403, 'Permission denied: treasury.transfer');
		});

		const result = (await wrapped()) as any;
		assert.equal(result.status, 403);
		assert.equal(result.data.errorCode, 'PERMISSION_DENIED');
		assert.equal(result.data.errorCategory, 'permission');
	});

	it('normalizes unknown exceptions as infrastructure failures', async () => {
		const wrapped = withCriticalAction(async () => {
			throw new Error('boom');
		});

		const result = (await wrapped()) as any;
		assert.equal(result.status, 500);
		assert.equal(result.data.errorCode, 'INTERNAL_ERROR');
		assert.equal(result.data.errorCategory, 'infrastructure');
	});

	it('preserves explicit validation code and category', () => {
		const result = failCritical({
			status: 400,
			category: 'validation',
			code: 'INVALID_AMOUNT',
			message: 'Amount must be greater than zero',
			legacyKey: 'sendError'
		});

		assert.equal(result.status, 400);
		assert.equal(result.data.errorCode, 'INVALID_AMOUNT');
		assert.equal(result.data.errorCategory, 'validation');
		assert.equal(result.data.sendError, 'Amount must be greater than zero');
	});
});
