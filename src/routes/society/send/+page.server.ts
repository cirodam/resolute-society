import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveLocalEntityById } from '$lib/server/utils/local-entity.util';
import { hasPermission } from '$lib/server/services/auth.service';
import { authorizeFromPrincipal, parsePrincipalRef } from '$lib/server/economy/send-auth';
import { createLedgerTransaction } from '$lib/server/economy/transactions';
import {
	LedgerTransactionValidationError,
	LEDGER_TRANSACTION_ERROR
} from '$lib/server/services/ledger.service';
import { canonicalTransferData, signData } from '$lib/server/federation/crypto';
import { enqueueFederationMessage } from '$lib/server/federation/client';
import { withCriticalAction } from '$lib/server/http/critical-action';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findDetailById(societyId);

	if (!society) throw error(404, 'Society not found');

	const fromPrincipal = locals.person ? `${locals.person.id}@${society.id}` : '';
	const canTransferFromTreasury = locals.person
		? await hasPermission({
			personId: locals.person.id,
			societyId,
			permissionCode: 'treasury.transfer'
		})
		: false;

	return {
		society,
		fromPrincipal,
		canTransferFromTreasury,
		hasKeypair: !!(await repos.keypair.get()),
		isAdmitted: await repos.federationMessageQueue.isAdmitted(society.handle)
	};
};

export const actions: Actions = {
	send: withCriticalAction(async ({ request, locals }) => {
		const data = await request.formData();
		const requestedFromPrincipal = data.get('fromPrincipal')?.toString().trim();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const currency = data.get('currency')?.toString().trim() as 'society_credits' | 'federation_credits' | undefined;
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { sendError: 'To principal is required' });
		if (currency !== 'society_credits' && currency !== 'federation_credits') {
			return fail(400, { sendError: 'Currency is required' });
		}
		if (amount <= 0) return fail(400, { sendError: 'Amount must be greater than zero' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const society = await repos.societies.findDetailById(societyId);
		if (!society) return fail(404, { sendError: 'Society not found' });

		const canTransferFromTreasury = locals.person
			? await hasPermission({
				personId: locals.person.id,
				societyId,
				permissionCode: 'treasury.transfer'
			})
			: false;

		const fromAuthorization = authorizeFromPrincipal({
			requestedFromPrincipal,
			authenticatedPersonId: locals.person?.id,
			societyId,
			canTransferFromTreasury
		});

		if (!fromAuthorization.ok) {
			return fail(fromAuthorization.status, { sendError: fromAuthorization.sendError });
		}

		const fromPrincipal = fromAuthorization.effectiveFromPrincipal;
		const fromId = fromAuthorization.fromId;
		const to = parsePrincipalRef(toPrincipal);
		if (!to) {
			return fail(400, { sendError: 'To principal is invalid' });
		}

		const toId = to.id;
		const toSocietyId = to.societyId;

		// Society credits are local-only. Federation credits always route through the federation
		// — even same-society transfers — because the federation is the authoritative ledger.
		if (currency === 'society_credits') {
			if (toSocietyId !== societyId) {
				return fail(400, { sendError: 'Society credits cannot be sent cross-society' });
			}

			const fromEntity = await resolveLocalEntityById(fromId, societyId, repos);
			const toEntity = await resolveLocalEntityById(toId, societyId, repos);

			if (!fromEntity) return fail(400, { sendError: 'Sender not found in this society' });
			if (!toEntity) return fail(400, { sendError: 'Recipient not found in this society' });

			try {
				await createLedgerTransaction({
					fromType: fromEntity.type,
					fromId: fromEntity.id,
					toType: toEntity.type,
					toId: toEntity.id,
					amount,
					note: null
				});
			} catch (error) {
				if (error instanceof LedgerTransactionValidationError) {
					if (error.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE) {
						return fail(400, { sendError: 'Insufficient balance' });
					}
					if (error.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT) {
						return fail(400, { sendError: 'Amount must be greater than zero' });
					}
				}
				throw error;
			}

			return { sent: true, settled: 'local' as const };
		}

		// Federation credits: sign and send to the federation regardless of society
		if (!(await repos.federationMessageQueue.isAdmitted(society.handle))) {
			return fail(400, { sendError: 'Society is not yet admitted to the federation' });
		}

		let signingKey: string;
		if (fromId === 'treasury') {
			const keypair = await repos.keypair.get();
			if (!keypair) return fail(500, { sendError: 'Society keypair not initialised' });
			signingKey = keypair.private_key;
		} else {
			const personPrivateKey = await repos.people.findPrivateKeyById(fromId);
			if (!personPrivateKey) {
				return fail(400, { sendError: 'Sender not found or has no keypair' });
			}
			signingKey = personPrivateKey;
		}

		const transfer = {
			id: randomUUID(),
			fromPrincipal,
			toPrincipal,
			amount,
			timestamp: new Date().toISOString()
		};

		const signature = signData(canonicalTransferData(transfer), signingKey);

		enqueueFederationMessage('transfer_requested', society.handle, { ...transfer, signature });

		return { sent: true, settled: 'federation' as const };
	}, {
		legacyKey: 'sendError',
		fallbackCode: 'SEND_FAILED',
		fallbackMessage: 'Send action failed'
	})
};
