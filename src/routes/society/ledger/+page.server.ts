import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getRepositories } from '$lib/server/infra/repositories';
import { performCloseDay } from '$lib/server/economy/close-day';
import { withCriticalAction } from '$lib/server/http/critical-action';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const today = new Date().toISOString().slice(0, 10);
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [todayRecord, recentDays, transactions, totalTxns, members] = await Promise.all([
		repos.ledgerDays.findByDate(societyId, today),
		repos.ledgerDays.listRecent(societyId, 30),
		repos.ledger.listSocietyTransactionsPaginated(societyId, PAGE_SIZE, offset),
		repos.ledger.countSocietyTransactions(societyId),
		repos.treasury.listSocietyMembers(societyId)
	]);

	return {
		society,
		today,
		todayRecord,
		recentDays,
		transactions,
		members,
		page,
		totalPages: Math.max(1, Math.ceil(totalTxns / PAGE_SIZE))
	};
};

export const actions = {
	closeDay: withCriticalAction(async (event) => {
		await requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const witnessedById = data.get('witnessed_by_id')?.toString() || null;

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const today = new Date().toISOString().slice(0, 10);

		const result = await performCloseDay({
			today,
			closedById: event.locals.person!.id,
			witnessedById: witnessedById || null,
			getOpeningBalance: async () => {
				const lastClosed = await repos.ledgerDays.findLastClosed(societyId);
				return lastClosed
					? lastClosed.closing_balance
					: await calculateBalance('society', societyId);
			},
			findOrCreateDay: (openingBalance) => repos.ledgerDays.findOrCreate(societyId, today, openingBalance),
			computeClosingBalance: () => calculateBalance('society', societyId),
			computeTotalSupply: async () => (await repos.treasury.calculateSummary(societyId)).totalSupply,
			countTransactions: () => repos.ledger.countForDate(today),
			closeDay: (params) => repos.ledgerDays.close(params),
			refetchDay: () => repos.ledgerDays.findByDate(societyId, today)
		});

		if (!result.ok) return result.failure;

		return { closeDaySuccess: true, date: result.date, pageNumber: result.pageNumber };
	}, {
		legacyKey: 'closeDayError',
		fallbackCode: 'LEDGER_CLOSE_FAILED',
		fallbackMessage: 'Unexpected ledger close failure'
	}),

	markPrinted: withCriticalAction(async (event) => {
		await requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const dayId = data.get('day_id')?.toString();

		if (!dayId) return fail(400, { markPrintedError: 'Day ID required' });

		await getRepositories().ledgerDays.markPrinted(dayId);

		return { markPrintedSuccess: true };
	}, {
		legacyKey: 'markPrintedError',
		fallbackCode: 'LEDGER_MARK_PRINTED_FAILED',
		fallbackMessage: 'Unable to mark ledger day as printed'
	})
} satisfies Actions;
