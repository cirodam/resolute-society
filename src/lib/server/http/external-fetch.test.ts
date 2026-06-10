import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { executeExternalFetch } from './external-fetch';

describe('executeExternalFetch', () => {
	it('classifies timeout failures', async () => {
		const fetchImpl: typeof fetch = (_input, init) =>
			new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('aborted', 'AbortError')),
					{ once: true }
				);
			});

		const result = await executeExternalFetch({
			url: 'http://example.test',
			timeoutMs: 5,
			retries: 0,
			fetchImpl
		});

		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.kind, 'timeout');
			assert.equal(result.attempts, 1);
		}
	});

	it('classifies thrown transport failures as network', async () => {
		const fetchImpl: typeof fetch = async () => {
			throw new TypeError('network down');
		};

		const result = await executeExternalFetch({
			url: 'http://example.test',
			timeoutMs: 100,
			retries: 0,
			fetchImpl
		});

		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.kind, 'network');
			assert.equal(result.attempts, 1);
		}
	});

	it('retries within budget and succeeds on later attempt', async () => {
		let attempts = 0;
		const fetchImpl: typeof fetch = async () => {
			attempts += 1;
			if (attempts === 1) {
				throw new TypeError('temporary network');
			}
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		};

		const result = await executeExternalFetch({
			url: 'http://example.test',
			timeoutMs: 100,
			retries: 1,
			fetchImpl
		});

		assert.equal(attempts, 2);
		assert.equal(result.ok, true);
		if (result.ok) {
			assert.equal(result.attempts, 2);
		}
	});

	it('classifies non-2xx upstream failures and respects upstream retry policy', async () => {
		let attempts = 0;
		const fetchImpl: typeof fetch = async () => {
			attempts += 1;
			return new Response('upstream unavailable', { status: 503 });
		};

		const result = await executeExternalFetch({
			url: 'http://example.test',
			timeoutMs: 100,
			retries: 1,
			retryOn: ['upstream'],
			retryableUpstreamStatuses: [503],
			fetchImpl
		});

		assert.equal(attempts, 2);
		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.kind, 'upstream');
			assert.equal(result.status, 503);
			assert.equal(result.attempts, 2);
		}
	});
});
