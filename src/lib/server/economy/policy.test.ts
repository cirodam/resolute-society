import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	requireFederationEconomyPermission,
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

	it('propagates denied permission for federation economy actions', () => {
		const denied = new Error('Permission denied: treasury.run_demurrage');
		let seenSocietyId: string | undefined;
		const checker: PermissionChecker = (_event, _permissionCode, societyId) => {
			seenSocietyId = societyId;
			throw denied;
		};

		const event = { locals: { person: { society_id: 'soc-2' } } } as any;

		assert.throws(
			() =>
				requireFederationEconomyPermission({
					event,
					permissionCode: 'treasury.run_demurrage',
					checkPermission: checker
				}),
			(error: unknown) => error === denied
		);

		assert.equal(seenSocietyId, 'soc-2');
	});

	it('does not throw when federation economy permission is granted', () => {
		const checker: PermissionChecker = () => { /* no-op: permission granted */ };
		const event = { locals: { person: { society_id: 'soc-3' } } } as any;

		assert.doesNotThrow(() =>
			requireFederationEconomyPermission({
				event,
				permissionCode: 'treasury.run_demurrage',
				checkPermission: checker
			})
		);
	});
});
