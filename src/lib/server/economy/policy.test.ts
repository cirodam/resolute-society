import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	requireSocietyTreasuryPermission,
	type PermissionChecker
} from './policy';

describe('economy policy permission guards', () => {
	it('propagates denied permission for society treasury actions', () => {
		const denied = new Error('Permission denied: treasury.transfer');
		const checker: PermissionChecker = () => {
			throw denied;
		};

		const event = { locals: { person: { society_id: 'soc-1' } } } as any;

		assert.throws(
			() =>
				requireSocietyTreasuryPermission({
					event,
					societyId: 'soc-1',
					permissionCode: 'treasury.transfer',
					checkPermission: checker
				}),
			(error: unknown) => error === denied
		);
	});

	it('does not throw when society treasury permission is granted', () => {
		const checker: PermissionChecker = () => { /* no-op: permission granted */ };
		const event = { locals: { person: { society_id: 'soc-1' } } } as any;

		assert.doesNotThrow(() =>
			requireSocietyTreasuryPermission({
				event,
				societyId: 'soc-1',
				permissionCode: 'treasury.transfer',
				checkPermission: checker
			})
		);
	});
});
