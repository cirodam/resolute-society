import { PERMISSION } from '$lib/permissions';
import { randomUUID } from 'crypto';
import { fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { calculateBalance, LedgerTransactionValidationError, LEDGER_TRANSACTION_ERROR } from '$lib/server/services/ledger.service';
import { createLedgerTransaction, runInRepositoryTransaction } from '$lib/server/economy/transactions';
import { getRepositories } from '$lib/server/infra/repositories';
import { withCriticalAction } from '$lib/server/http/critical-action';

export const allowanceActions = {
	runAllowanceGroup: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_RUN_ALLOWANCE_GROUP, resolveSocietyId(undefined));

		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		if (!groupId) return fail(400, { allowanceError: 'Group ID required' });

		const repositories = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const group = await repositories.allowanceGroups.find(societyId, groupId);
		if (!group) return fail(400, { allowanceError: 'Allowance group not found' });

		const members = await repositories.allowanceGroups.listMembersByGroup(groupId);
		if (members.length === 0) return fail(400, { allowanceError: 'No members in this group' });

		const totalRequired = members.reduce((sum, m) => sum + m.amount, 0);
		const societyBalance = await calculateBalance('society', societyId);
		if (societyBalance < totalRequired) {
			return fail(400, {
				allowanceError: `Insufficient treasury balance. Need ${totalRequired.toFixed(2)}, have ${societyBalance.toFixed(2)}`
			});
		}

		try {
			await runInRepositoryTransaction(async (repos) => {
				for (const member of members) {
					await createLedgerTransaction(
						{ fromType: 'society', fromId: societyId, toType: 'person', toId: member.id, amount: member.amount, note: `Allowance: ${group.name}` },
						repos
					);
				}
			});
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE)
					return fail(400, { allowanceError: 'Insufficient treasury balance' });
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT)
					return fail(400, { allowanceError: 'Allowance amount must be greater than zero' });
			}
			return fail(500, { allowanceError: 'Allowance batch failed and was rolled back' });
		}

		return { allowanceSuccess: true, groupName: group.name, distributed: totalRequired, recipientCount: members.length };
	}, {
		legacyKey: 'allowanceError',
		fallbackCode: 'TREASURY_ALLOWANCE_GROUP_FAILED',
		fallbackMessage: 'Allowance group run failed'
	}),

	createAllowanceGroup: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_CREATE_ALLOWANCE_GROUP, resolveSocietyId(undefined));
		const data = await request.formData();
		const name = data.get('name')?.toString();
		if (!name) return fail(400, { createGroupError: 'Name required' });

		const repositories = getRepositories();
		const societyId = resolveSocietyId(undefined);
		if (await repositories.allowanceGroups.exists(societyId, name))
			return fail(400, { createGroupError: 'Group with this name already exists' });

		await repositories.allowanceGroups.create(societyId, name, randomUUID());
		return { createGroupSuccess: true };
	}, {
		legacyKey: 'createGroupError',
		fallbackCode: 'TREASURY_CREATE_GROUP_FAILED',
		fallbackMessage: 'Create allowance group failed'
	}),

	deleteAllowanceGroup: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_DELETE_ALLOWANCE_GROUP, resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		if (!groupId) return fail(400, { deleteGroupError: 'Group ID required' });

		const repositories = getRepositories();
		const group = await repositories.allowanceGroups.find(resolveSocietyId(undefined), groupId);
		if (!group) return fail(400, { deleteGroupError: 'Group not found' });

		await repositories.allowanceGroups.delete(groupId);
		return { deleteGroupSuccess: true };
	}, {
		legacyKey: 'deleteGroupError',
		fallbackCode: 'TREASURY_DELETE_GROUP_FAILED',
		fallbackMessage: 'Delete allowance group failed'
	}),

	addGroupMember: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_MANAGE_ALLOWANCE_MEMBERS, resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!groupId || !personId || amount <= 0)
			return fail(400, { addMemberError: 'Group, person, and amount required' });

		const repositories = getRepositories();
		if (await repositories.allowanceGroups.memberExists(groupId, personId))
			return fail(400, { addMemberError: 'Person already in this group' });

		await repositories.allowanceGroups.addMember(groupId, personId, amount);
		return { addMemberSuccess: true };
	}, {
		legacyKey: 'addMemberError',
		fallbackCode: 'TREASURY_ADD_GROUP_MEMBER_FAILED',
		fallbackMessage: 'Add group member failed'
	}),

	removeGroupMember: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_MANAGE_ALLOWANCE_MEMBERS, resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();
		if (!groupId || !personId) return fail(400, { removeMemberError: 'Group and person required' });

		await getRepositories().allowanceGroups.removeMember(groupId, personId);
		return { removeMemberSuccess: true };
	}, {
		legacyKey: 'removeMemberError',
		fallbackCode: 'TREASURY_REMOVE_GROUP_MEMBER_FAILED',
		fallbackMessage: 'Remove group member failed'
	}),

	updateMemberAmount: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_MANAGE_ALLOWANCE_MEMBERS, resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!groupId || !personId || amount <= 0)
			return fail(400, { updateAmountError: 'Group, person, and amount required' });

		await getRepositories().allowanceGroups.updateMemberAmount(groupId, personId, amount);
		return { updateAmountSuccess: true };
	}, {
		legacyKey: 'updateAmountError',
		fallbackCode: 'TREASURY_UPDATE_GROUP_AMOUNT_FAILED',
		fallbackMessage: 'Update group member amount failed'
	}),

	distributeUniversalAllowance: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, PERMISSION.TREASURY_DISTRIBUTE_UNIVERSAL_ALLOWANCE, resolveSocietyId(undefined));

		const data = await request.formData();
		const amountPerMember = parseFloat(data.get('amount')?.toString() || '0');
		if (amountPerMember <= 0) return fail(400, { universalAllowanceError: 'Amount must be greater than 0' });

		const repositories = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const members = await repositories.treasury.listSocietyPrincipals(societyId);
		if (members.length === 0) return fail(400, { universalAllowanceError: 'No members in society' });

		const totalAmount = members.length * amountPerMember;
		const societyBalance = await calculateBalance('society', societyId);
		if (societyBalance < totalAmount) {
			return fail(400, {
				universalAllowanceError: `Insufficient funds. Need ${totalAmount.toFixed(2)} credits, have ${societyBalance.toFixed(2)}`
			});
		}

		try {
			await runInRepositoryTransaction(async (repos) => {
				for (const member of members) {
					await createLedgerTransaction(
						{ fromType: 'society', fromId: societyId, toType: 'person', toId: member.id, amount: amountPerMember, note: 'Universal allowance distribution' },
						repos
					);
				}
			});
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE)
					return fail(400, { universalAllowanceError: 'Insufficient treasury balance' });
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT)
					return fail(400, { universalAllowanceError: 'Amount must be greater than 0' });
			}
			return fail(500, { universalAllowanceError: 'Universal allowance batch failed and was rolled back' });
		}

		return { universalAllowanceSuccess: true, memberCount: members.length, totalAmount, amountPerMember };
	}, {
		legacyKey: 'universalAllowanceError',
		fallbackCode: 'TREASURY_UNIVERSAL_ALLOWANCE_FAILED',
		fallbackMessage: 'Universal allowance distribution failed'
	})
};
