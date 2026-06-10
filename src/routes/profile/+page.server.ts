import { getRepositories } from '$lib/server/infra/repositories';
import {
	getFederationBalanceWithMeta,
	getFederationHistoryWithMeta
} from '$lib/server/federation/client';
import { canonicalTransferData, signData } from '$lib/server/federation/crypto';
import { enqueueFederationMessage } from '$lib/server/federation/client';
import { resolveLocalEntityById } from '$lib/server/utils/local-entity.util';
import { withCriticalAction } from '$lib/server/http/critical-action';
import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.person) {
		throw error(401, 'Not authenticated');
	}

	const personId = locals.person.id;
	const repositories = getRepositories();
	const person = await repositories.people.findProfileById(personId);
	const society = person ? await repositories.societies.findDetailById(person.society_id) : null;

	if (!person || !society) {
		throw error(404, 'Person not found');
	}

	const principal = `${person.id}@${society.id}`;

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [societyCredits, totalTxns, societyTransactions, federationBalanceRead, federationHistoryRead] = await Promise.all([
		repositories.ledger.calculateBalance('person', personId),
		repositories.ledger.countPersonTransactions(personId),
		repositories.ledger.listPersonTransactionsPaginated(personId, PAGE_SIZE, offset),
		getFederationBalanceWithMeta(principal),
		getFederationHistoryWithMeta(principal)
	]);

	const federationCredits = federationBalanceRead.balance;
	const federationHistory = federationHistoryRead.history;

	// Build federation passbook with running balance
	const federationTransactions = federationHistory.map((t, index, arr) => {
		let balance = 0;
		for (let i = 0; i <= index; i++) {
			const txn = arr[i];
			if (txn.to_principal === principal) {
				balance += txn.amount;
			} else {
				balance -= txn.amount;
			}
		}
		return { ...t, running_balance: balance };
	});

	return {
		person: {
			...person,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		principal,
		societyHandle: society.handle,
		federationRead: {
			balanceDegraded: federationBalanceRead.degraded,
			balanceReason: federationBalanceRead.reason,
			balanceStatus: federationBalanceRead.status,
			historyDegraded: federationHistoryRead.degraded,
			historyReason: federationHistoryRead.reason,
			historyStatus: federationHistoryRead.status
		},
		hasKeypair: !!(await repositories.keypair.get()),
		isAdmitted: await repositories.federationMessageQueue.isAdmitted(society.handle),
		societyTransactions,
		federationTransactions,
		page,
		totalPages: Math.max(1, Math.ceil(totalTxns / PAGE_SIZE))
	};
};

export const actions: Actions = {
	send: withCriticalAction(async ({ request, locals }) => {
		if (!locals.person) return fail(401, { sendError: 'Not authenticated' });

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const currency = data.get('currency')?.toString() as 'society_credits' | 'federation_credits';
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { sendError: 'Recipient is required' });
		if (currency !== 'society_credits' && currency !== 'federation_credits')
			return fail(400, { sendError: 'Invalid currency' });
		if (amount <= 0) return fail(400, { sendError: 'Amount must be greater than zero' });

		const repos = getRepositories();
		const person = await repos.people.findProfileById(locals.person.id);
		if (!person) return fail(404, { sendError: 'Person not found' });
		const society = await repos.societies.findDetailById(person.society_id);
		if (!society) return fail(404, { sendError: 'Society not found' });

		const fromPrincipal = `${person.id}@${society.id}`;
		const toAt = toPrincipal.indexOf('@');
		const toId = toPrincipal.slice(0, toAt);
		const toSocietyId = toPrincipal.slice(toAt + 1);

		if (currency === 'society_credits') {
			if (toSocietyId !== society.id)
				return fail(400, { sendError: 'Society credits cannot be sent cross-society' });

			const fromEntity = await resolveLocalEntityById(person.id, person.society_id, repos);
			const toEntity = await resolveLocalEntityById(toId, person.society_id, repos);

			if (!fromEntity) return fail(400, { sendError: 'Your account could not be resolved' });
			if (!toEntity) return fail(400, { sendError: 'Recipient not found in this society' });

			await repos.ledger.createTransaction({
				fromType: fromEntity.type,
				fromId: fromEntity.id,
				toType: toEntity.type,
				toId: toEntity.id,
				amount,
				note: null
			});

			return { sent: true, settled: 'local' as const };
		}

		// Federation credits
		if (!(await repos.federationMessageQueue.isAdmitted(society.handle)))
			return fail(400, { sendError: 'Society is not yet admitted to the federation' });

		const personPrivateKey = await repos.people.findPrivateKeyById(person.id);
		if (!personPrivateKey)
			return fail(400, { sendError: 'No keypair found for your account' });

		const transfer = {
			id: randomUUID(),
			fromPrincipal,
			toPrincipal,
			amount,
			timestamp: new Date().toISOString()
		};
		const signature = signData(canonicalTransferData(transfer), personPrivateKey);
		enqueueFederationMessage('transfer_requested', society.handle, { ...transfer, signature });

		return { sent: true, settled: 'federation' as const };
	}, {
		legacyKey: 'sendError',
		fallbackCode: 'PROFILE_SEND_FAILED',
		fallbackMessage: 'Unable to complete send action'
	})
};
