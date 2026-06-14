import { getRepositories } from '$lib/server/infra/repositories';
import { getFedBalance, getFedHistory } from '$lib/server/economy/fed-balance';
import { sendFedTransfer } from '$lib/server/federation/p2p';
import { withCriticalAction } from '$lib/server/http/critical-action';
import { resolveLocalEntityById, resolveLocalEntity } from '$lib/server/utils/local-entity.util';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.person) throw error(401, 'Not authenticated');

	const repos = getRepositories();
	const person = await repos.people.findProfileById(locals.person.id);
	const society = person ? await repos.societies.findDetailById(person.society_id) : null;

	if (!person || !society) throw error(404, 'Person not found');

	const principal = `${person.handle}@${society.handle}`;

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [societyCredits, totalTxns, societyTransactions, federationCredits, fedHistory, hasKeypair] =
		await Promise.all([
			repos.ledger.calculateBalance('person', person.id),
			repos.ledger.countPersonTransactions(person.id),
			repos.ledger.listPersonTransactionsPaginated(person.id, PAGE_SIZE, offset),
			getFedBalance(principal),
			getFedHistory(principal),
			repos.keypair.get().then((k) => !!k)
		]);

	let runningBalance = federationCredits;
	const fedTransactions = fedHistory.map((t) => {
		const balanceAfter = runningBalance;
		const contribution = t.to_principal === principal ? t.amount : -t.amount;
		runningBalance -= contribution;
		return { ...t, running_balance: balanceAfter };
	});

	return {
		person: { ...person, society_credits: societyCredits, federation_credits: federationCredits },
		principal,
		hasKeypair,
		page,
		totalPages: Math.max(1, Math.ceil(totalTxns / PAGE_SIZE)),
		societyTransactions,
		fedTransactions
	};
};

export const actions: Actions = {
	send: withCriticalAction(async ({ request, locals }) => {
		if (!locals.person) return fail(401, { sendError: 'Not authenticated' });

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { sendError: 'Recipient is required' });
		if (amount <= 0) return fail(400, { sendError: 'Amount must be greater than zero' });

		const repos = getRepositories();
		const person = await repos.people.findProfileById(locals.person.id);
		if (!person) return fail(404, { sendError: 'Person not found' });

		const toAt = toPrincipal.indexOf('@');
		const toHandle = toPrincipal.slice(0, toAt);
		const toSocietyHandle = toPrincipal.slice(toAt + 1);

		const society = await repos.societies.findDetailById(person.society_id);
		if (!society) return fail(404, { sendError: 'Society not found' });

		if (toSocietyHandle !== society.handle)
			return fail(400, { sendError: 'Society credits cannot be sent cross-society' });

		const fromEntity = await resolveLocalEntityById(person.id, person.society_id, repos);
		const toEntity = await resolveLocalEntity(toHandle, person.society_id, repos);

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

		return { sent: true };
	}, {
		legacyKey: 'sendError',
		fallbackCode: 'PROFILE_SEND_FAILED',
		fallbackMessage: 'Unable to complete send action'
	}),

	sendFed: withCriticalAction(async ({ request, locals }) => {
		if (!locals.person) return fail(401, { sendFedError: 'Not authenticated' });

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { sendFedError: 'Recipient is required' });
		if (amount <= 0) return fail(400, { sendFedError: 'Amount must be greater than zero' });

		const repos = getRepositories();
		const person = await repos.people.findProfileById(locals.person.id);
		if (!person) return fail(404, { sendFedError: 'Person not found' });

		const society = await repos.societies.findDetailById(person.society_id);
		if (!society) return fail(404, { sendFedError: 'Society not found' });

		const fromPrincipal = `${person.handle}@${society.handle}`;
		await sendFedTransfer({ fromPrincipal, toPrincipal, amount });

		return { sentFed: true };
	}, {
		legacyKey: 'sendFedError',
		fallbackCode: 'FED_PASSBOOK_SEND_FAILED',
		fallbackMessage: 'Unable to complete federation transfer'
	})
};
