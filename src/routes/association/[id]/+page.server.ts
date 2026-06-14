import { error, fail } from '@sveltejs/kit';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFedBalance } from '$lib/server/economy/fed-balance';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { resolveLocalEntity } from '$lib/server/utils/local-entity.util';
import { createLedgerTransaction } from '$lib/server/economy/transactions';
import { LedgerTransactionValidationError, LEDGER_TRANSACTION_ERROR } from '$lib/server/services/ledger.service';
import { hasPermission } from '$lib/server/services/auth.service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const association = await repositories.associations.findById(params.id);
	const society = association ? await repositories.societies.findDetailById(association.society_id) : null;

	if (!association || !society) {
		throw error(404, 'Association not found');
	}

	const societyCredits = await calculateBalance('association', params.id);
	const federationCredits = await getFedBalance(`${association.handle}@${society.handle}`);

	const societyId = association.society_id;

	const isMember = locals.person
		? await repositories.associations.isMember(params.id, locals.person.id)
		: false;

	const canManageMembers = locals.person
		? await hasPermission({ personId: locals.person.id, societyId, permissionCode: 'membership.create_association' })
		: false;

	const [inbox, sent] = isMember
		? await Promise.all([
			repositories.messages.listInboxForAssociation(params.id),
			repositories.messages.listSentForAssociation(params.id)
		])
		: [[], []];

	return {
		association: {
			...association,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		members: await repositories.associations.listMembers(params.id),
		isMember,
		canManageMembers,
		inbox,
		sent
	};
};

export const actions: Actions = {
	sendCredits: async ({ request, locals, params }) => {
		if (!locals.person) return fail(401, { creditsError: 'Not authenticated' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);

		const isMember = await repos.associations.isMember(params.id, locals.person.id);
		if (!isMember) return fail(403, { creditsError: 'Members only' });

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { creditsError: 'Recipient is required' });
		if (amount <= 0) return fail(400, { creditsError: 'Amount must be greater than zero' });

		const toEntity = await resolveLocalEntity(toPrincipal.split('@')[0], societyId, repos);
		if (!toEntity) return fail(400, { creditsError: 'Recipient not found in this society' });

		try {
			await createLedgerTransaction({
				fromType: 'association',
				fromId: params.id,
				toType: toEntity.type,
				toId: toEntity.id,
				amount,
				note: null
			});
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE) {
					return fail(400, { creditsError: 'Insufficient balance' });
				}
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT) {
					return fail(400, { creditsError: 'Amount must be greater than zero' });
				}
			}
			throw err;
		}

		return { creditsSent: true };
	},

	sendMessage: async ({ request, locals, params }) => {
		if (!locals.person) return fail(401, { messageError: 'Not authenticated' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);

		const isMember = await repos.associations.isMember(params.id, locals.person.id);
		if (!isMember) return fail(403, { messageError: 'Members only' });

		const data = await request.formData();
		const recipientAddress = data.get('recipient')?.toString().trim();
		const subject = data.get('subject')?.toString().trim();
		const body = data.get('body')?.toString().trim();

		if (!recipientAddress || !subject || !body) {
			return fail(400, { messageError: 'All fields are required' });
		}

		let resolvedAddress = recipientAddress;
		if (!recipientAddress.includes('@')) {
			const society = await repos.societies.findDetailById(societyId);
			if (!society) return fail(500, { messageError: 'Society not found' });
			resolvedAddress = `${recipientAddress}@${society.handle}`;
		}

		const [handle, societyHandle] = resolvedAddress.split('@');
		if (!handle || !societyHandle) {
			return fail(400, { messageError: 'Invalid address format. Use: handle@society-handle' });
		}

		const recipient = await repos.messages.findMessageRecipient(handle, societyHandle);
		if (!recipient) return fail(400, { messageError: 'Recipient not found' });

		await repos.messages.sendMessage({
			senderId: locals.person.id,
			senderAssociationId: params.id,
			recipientId: recipient.type === 'person' ? recipient.id : null,
			recipientAssociationId: recipient.type === 'association' ? recipient.id : null,
			subject,
			body
		});

		return { messageSent: true };
	},

	addMember: async ({ request, locals, params }) => {
		if (!locals.person) return fail(401, { memberError: 'Not authenticated' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);

		const canManage = await hasPermission({ personId: locals.person.id, societyId, permissionCode: 'membership.create_association' });
		if (!canManage) return fail(403, { memberError: 'Permission denied' });

		const data = await request.formData();
		const handle = data.get('handle')?.toString().trim();
		if (!handle) return fail(400, { memberError: 'Handle is required' });

		const person = await repos.people.findByHandleAndSociety(handle, societyId);
		if (!person) return fail(400, { memberError: `No member found with handle @${handle}` });

		await repos.associations.addMember(params.id, person.id);

		return { memberAdded: true };
	},

	removeMember: async ({ request, locals, params }) => {
		if (!locals.person) return fail(401, { memberError: 'Not authenticated' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);

		const canManage = await hasPermission({ personId: locals.person.id, societyId, permissionCode: 'membership.create_association' });
		if (!canManage) return fail(403, { memberError: 'Permission denied' });

		const data = await request.formData();
		const personId = data.get('person_id')?.toString();
		if (!personId) return fail(400, { memberError: 'Person ID is required' });

		await repos.associations.removeMember(params.id, personId);

		return { memberRemoved: true };
	}
};
