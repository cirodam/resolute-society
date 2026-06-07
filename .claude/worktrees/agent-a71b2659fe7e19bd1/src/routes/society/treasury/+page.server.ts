import { randomUUID } from 'crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { error, fail } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFederationBalance, enqueueFederationMessage } from '$lib/server/federation/client';
import { canonicalTransferData, signData } from '$lib/server/federation/crypto';
import { requireSocietyTreasuryPermission } from '$lib/server/economy/policy';
import { resolveSocietyMemberByHandle } from '$lib/server/economy/addressing';
import { collectDemurrage, type DemurrageMode } from '$lib/server/economy/demurrage';
import {
	getSupplySnapshot,
	reconcileEndowmentMint,
	runSupplyReconciliationDemurrage
} from '$lib/server/economy/reconciliation';
import {
	disburseToResolvedPrincipal,
	hasSufficientBalance,
	isValidPositiveAmount
} from '$lib/server/economy/disbursement';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = repositories.treasury.findSocietyById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const societyId = resolveSocietyId(undefined);
	const summary = repositories.treasury.calculateSummary(societyId);
	const supplySnapshot = getSupplySnapshot(societyId);
	const federationCredits = await getFederationBalance(`treasury@${society.handle}`);
	const allowanceGroups = repositories.allowanceGroups.listBySociety(societyId);
	const members = repositories.treasury.listSocietyMembers(societyId);
	const groupMembers = repositories.allowanceGroups.listMembers(societyId);
	const positions = repositories.positions.listForPayroll(societyId);
	const memberCount = repositories.treasury.getMemberCount(societyId);

	const membersByGroup = groupMembers.reduce(
		(acc, groupMember) => {
			if (!acc[groupMember.group_id]) acc[groupMember.group_id] = [];
			acc[groupMember.group_id].push(groupMember);
			return acc;
		},
		{} as Record<string, typeof groupMembers>
	);

	return {
		society: {
			...society,
			society_credits: summary.societyCredits,
			federation_credits: federationCredits
		},
		totalMoneySupply: summary.totalSupply,
		expectedMoneySupply: supplySnapshot.expectedSupply,
		supplyExcess: supplySnapshot.supplyExcess,
		supplyShortfall: supplySnapshot.supplyShortfall,
		principalCredits: summary.principalCredits,
		allowanceGroups,
		members,
		membersByGroup,
		positions,
		memberCount
	};
};

export const actions = {
	runDemurrage: async (event) => {
		const { request, params } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_demurrage'
		});

		const data = await request.formData();
		const modeRaw = data.get('mode')?.toString();
		const value = parseFloat(data.get('value')?.toString() || '0');

		if (value <= 0) {
			return fail(400, { error: 'Please enter a valid amount' });
		}

		let demurrageMode: DemurrageMode;
		if (modeRaw === 'percent' || modeRaw === 'flat') {
			demurrageMode = modeRaw;
		} else {
			return fail(400, { error: 'Please enter a valid amount' });
		}

		const repositories = getRepositories();
		const people = repositories.treasury.listSocietyPrincipals(resolveSocietyId(undefined));
		const associations = repositories.treasury.listSocietyAssociations(resolveSocietyId(undefined));

		const { totalCollected } = collectDemurrage({
			principals: [
				...people.map((person) => ({ type: 'person' as const, id: person.id })),
				...associations.map((association) => ({ type: 'association' as const, id: association.id }))
			],
			target: { type: 'society', id: resolveSocietyId(undefined) },
				mode: demurrageMode,
			value,
			note: `Demurrage: ${demurrageMode === 'percent' ? value + '%' : value + ' per principal'}`
		});

		return {
			success: true,
			collected: totalCollected,
			principalCount: people.length + associations.length
		};
	},

	reconcileEndowmentMint: async (event) => {
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_demurrage'
		});
		const result = reconcileEndowmentMint(resolveSocietyId(undefined));

		return {
			endowmentMintSuccess: true,
			minted: result.minted,
			expectedSupply: result.expectedSupply,
			totalSupply: result.totalSupply
		};
	},

	runSupplyReconciliationDemurrage: async (event) => {
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_demurrage'
		});

		const result = runSupplyReconciliationDemurrage(resolveSocietyId(undefined));

		return {
			supplyReconcileSuccess: true,
			burned: result.burned,
			remainingExcess: result.remainingExcess,
			expectedSupply: result.expectedSupply,
			totalSupply: result.totalSupply,
			principalCount: result.principalCount
		};
	},

	transfer: async (event) => {
		const { request, params } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.transfer'
		});
		const data = await request.formData();
		const handle = data.get('handle')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!handle || !isValidPositiveAmount(amount)) {
			return fail(400, { transferError: 'Please enter a valid handle and amount' });
		}

		if (!hasSufficientBalance('society', resolveSocietyId(undefined), amount)) {
			return fail(400, { transferError: 'Insufficient treasury balance' });
		}

		const recipient = resolveSocietyMemberByHandle(handle, resolveSocietyId(undefined));

		if (recipient) {
			disburseToResolvedPrincipal({
				fromType: 'society',
				fromId: resolveSocietyId(undefined),
						amount,
				recipient,
				note: `Treasury transfer to ${handle}`
			});

			return {
				transferSuccess: true,
				recipient: recipient.label,
				amount
			};
		}

		return fail(400, { transferError: 'Person or association not found with that handle' });
	},

	transferFederationCredits: async (event) => {
		const { request } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.transfer'
		});

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { federationTransferError: 'Recipient principal is required' });
		if (!isValidPositiveAmount(amount)) return fail(400, { federationTransferError: 'Please enter a valid amount' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const society = repos.societies.findDetailById(societyId);
		if (!society) return fail(404, { federationTransferError: 'Society not found' });

		const keypair = repos.keypair.get();
		if (!keypair) return fail(500, { federationTransferError: 'Society keypair not initialised' });

		if (!repos.federationMessageQueue.isAdmitted(society.handle)) {
			return fail(400, { federationTransferError: 'Society is not yet admitted to the federation' });
		}

		const transfer = {
			id: randomUUID(),
			fromPrincipal: `treasury@${society.id}`,
			toPrincipal,
			amount,
			timestamp: new Date().toISOString()
		};

		const signature = signData(canonicalTransferData(transfer), keypair.private_key);
		enqueueFederationMessage('transfer_requested', society.handle, { ...transfer, signature });

		return { federationTransferSuccess: true, toPrincipal, amount };
	},

	runAllowanceGroup: async (event) => {
		const { request, params } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_allowance_group'
		});
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();

		if (!groupId) {
			return fail(400, { allowanceError: 'Group ID required' });
		}

		const repositories = getRepositories();
		const group = repositories.allowanceGroups.find(resolveSocietyId(undefined), groupId);

		if (!group) {
			return fail(400, { allowanceError: 'Allowance group not found' });
		}

		const members = repositories.allowanceGroups.listMembersByGroup(groupId);

		if (members.length === 0) {
			return fail(400, { allowanceError: 'No members in this group' });
		}

		const totalRequired = members.reduce((sum, member) => sum + member.amount, 0);
		const societyBalance = calculateBalance('society', resolveSocietyId(undefined));
		if (societyBalance < totalRequired) {
			return fail(400, {
				allowanceError: `Insufficient treasury balance. Need ${totalRequired.toFixed(2)}, have ${societyBalance.toFixed(2)}`
			});
		}

		for (const member of members) {
			repositories.ledger.createTransaction({
				fromType: 'society',
				fromId: resolveSocietyId(undefined),
				toType: 'person',
				toId: member.id,
						amount: member.amount,
				note: `Allowance: ${group.name}`
			});
		}

		return {
			allowanceSuccess: true,
			groupName: group.name,
			distributed: totalRequired,
			recipientCount: members.length
		};
	},

	createAllowanceGroup: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.create_allowance_group', resolveSocietyId(undefined));
		const data = await request.formData();
		const name = data.get('name')?.toString();

		if (!name) {
			return fail(400, { createGroupError: 'Name required' });
		}

		const repositories = getRepositories();
		if (repositories.allowanceGroups.exists(resolveSocietyId(undefined), name)) {
			return fail(400, { createGroupError: 'Group with this name already exists' });
		}

		repositories.allowanceGroups.create(resolveSocietyId(undefined), name, randomUUID());

		return { createGroupSuccess: true };
	},

	deleteAllowanceGroup: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.delete_allowance_group', resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();

		if (!groupId) {
			return fail(400, { deleteGroupError: 'Group ID required' });
		}

		const repositories = getRepositories();
		const group = repositories.allowanceGroups.find(resolveSocietyId(undefined), groupId);

		if (!group) {
			return fail(400, { deleteGroupError: 'Group not found' });
		}

		repositories.allowanceGroups.delete(groupId);

		return { deleteGroupSuccess: true };
	},

	addGroupMember: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.manage_allowance_members', resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!groupId || !personId || amount <= 0) {
			return fail(400, { addMemberError: 'Group, person, and amount required' });
		}

		const repositories = getRepositories();
		if (repositories.allowanceGroups.memberExists(groupId, personId)) {
			return fail(400, { addMemberError: 'Person already in this group' });
		}

		repositories.allowanceGroups.addMember(groupId, personId, amount);

		return { addMemberSuccess: true };
	},

	removeGroupMember: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.manage_allowance_members', resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();

		if (!groupId || !personId) {
			return fail(400, { removeMemberError: 'Group and person required' });
		}

		getRepositories().allowanceGroups.removeMember(groupId, personId);

		return { removeMemberSuccess: true };
	},

	updateMemberAmount: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.manage_allowance_members', resolveSocietyId(undefined));
		const data = await request.formData();
		const groupId = data.get('group_id')?.toString();
		const personId = data.get('person_id')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!groupId || !personId || amount <= 0) {
			return fail(400, { updateAmountError: 'Group, person, and amount required' });
		}

		getRepositories().allowanceGroups.updateMemberAmount(groupId, personId, amount);

		return { updateAmountSuccess: true };
	},

	runPositionPayroll: async (event) => {
		const { params } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_position_payroll'
		});
		const repositories = getRepositories();
		const positions = repositories.positions.listPayrollCandidates(resolveSocietyId(undefined));

		if (positions.length === 0) {
			return fail(400, { payrollError: 'No positions to pay' });
		}

		const totalPayroll = positions.reduce((sum, position) => sum + position.current_allowance, 0);
		const societyBalance = calculateBalance('society', resolveSocietyId(undefined));
		if (societyBalance < totalPayroll) {
			return fail(400, {
				payrollError: `Insufficient funds. Need ${totalPayroll} credits, have ${societyBalance}`
			});
		}

		for (const position of positions) {
			repositories.ledger.createTransaction({
				fromType: 'society',
				fromId: resolveSocietyId(undefined),
				toType: 'person',
				toId: position.current_person_id,
						amount: position.current_allowance,
				note: `Payroll: ${position.name}`
			});
		}

		return {
			payrollSuccess: true,
			paidCount: positions.length,
			totalAmount: totalPayroll
		};
	},

	adjustPositionAllowance: async (event) => {
		const { request, params } = event;
		requirePermission(event, 'treasury.adjust_position_allowance', resolveSocietyId(undefined));
		const data = await request.formData();
		const positionId = data.get('position_id')?.toString();
		const newAllowance = parseFloat(data.get('current_allowance')?.toString() || '0');
		const reason = data.get('reason')?.toString() || null;

		if (!positionId || newAllowance < 0) {
			return fail(400, { adjustAllowanceError: 'Invalid input' });
		}

		getRepositories().positions.updateAllowance({
			positionId,
			newAllowance,
			reason,
			societyId: resolveSocietyId(undefined)
		});

		return { adjustAllowanceSuccess: true };
	},

	distributeUniversalAllowance: async (event) => {
		const { request, params } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.distribute_universal_allowance'
		});
		const data = await request.formData();
		const amountPerMember = parseFloat(data.get('amount')?.toString() || '0');

		if (amountPerMember <= 0) {
			return fail(400, { universalAllowanceError: 'Amount must be greater than 0' });
		}

		const repositories = getRepositories();
		const members = repositories.treasury.listSocietyPrincipals(resolveSocietyId(undefined));

		if (members.length === 0) {
			return fail(400, { universalAllowanceError: 'No members in society' });
		}

		const totalAmount = members.length * amountPerMember;
		const societyBalance = calculateBalance('society', resolveSocietyId(undefined));
		if (societyBalance < totalAmount) {
			return fail(400, {
				universalAllowanceError: `Insufficient funds. Need ${totalAmount.toFixed(2)} credits, have ${societyBalance.toFixed(2)}`
			});
		}

		for (const member of members) {
			repositories.ledger.createTransaction({
				fromType: 'society',
				fromId: resolveSocietyId(undefined),
				toType: 'person',
				toId: member.id,
						amount: amountPerMember,
				note: 'Universal allowance distribution'
			});
		}

		return {
			universalAllowanceSuccess: true,
			memberCount: members.length,
			totalAmount,
			amountPerMember
		};
	}
} satisfies Actions;
