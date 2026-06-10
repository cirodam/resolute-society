import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getFederationRetryDelaySeconds } from './federation-message-queue.repository';

describe('federation queue retry schedule', () => {
	it('grows retry delay with attempt count before cooldown threshold', () => {
		const d1 = getFederationRetryDelaySeconds(1);
		const d2 = getFederationRetryDelaySeconds(2);
		const d3 = getFederationRetryDelaySeconds(3);

		assert.equal(d1, 10);
		assert.equal(d2, 20);
		assert.equal(d3, 40);
		assert.ok(d1 < d2 && d2 < d3);
	});

	it('caps exponential delay before cooldown and then enters long cooldown', () => {
		const beforeCooldown = getFederationRetryDelaySeconds(11);
		const atCooldown = getFederationRetryDelaySeconds(12);
		const aboveCooldown = getFederationRetryDelaySeconds(15);

		assert.equal(beforeCooldown, 3600);
		assert.equal(atCooldown, 86400);
		assert.equal(aboveCooldown, 86400);
		assert.ok(atCooldown > beforeCooldown);
	});
});
