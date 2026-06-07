import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const today = new Date().toISOString().slice(0, 10);

	return {
		society,
		today,
		todayRecord: repos.ledgerDays.findByDate(societyId, today),
		recentDays: repos.ledgerDays.listRecent(societyId, 30),
		transactions: repos.ledger.listSocietyTransactions(societyId),
		members: repos.treasury.listSocietyMembers(societyId)
	};
};

export const actions = {
	closeDay: async (event) => {
		requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const witnessedById = data.get('witnessed_by_id')?.toString() || null;

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const today = new Date().toISOString().slice(0, 10);

		const lastClosed = repos.ledgerDays.findLastClosed(societyId);
		const openingBalance = lastClosed
			? lastClosed.closing_balance
			: calculateBalance('society', societyId);

		const day = repos.ledgerDays.findOrCreate(societyId, today, openingBalance);

		if (day.status === 'closed' || day.status === 'archived') {
			return fail(400, { closeDayError: "Today's ledger is already closed" });
		}

		const closingBalance = calculateBalance('society', societyId);
		const summary = repos.treasury.calculateSummary(societyId);
		const transactionCount = repos.ledger.countForDate(today);

		repos.ledgerDays.close({
			dayId: day.id,
			closingBalance,
			totalSupply: summary.totalSupply,
			transactionCount,
			closedById: event.locals.person!.id,
			witnessedById: witnessedById || null
		});

		return { closeDaySuccess: true, date: today, pageNumber: day.page_number };
	},

	markPrinted: async (event) => {
		requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const dayId = data.get('day_id')?.toString();

		if (!dayId) return fail(400, { markPrintedError: 'Day ID required' });

		getRepositories().ledgerDays.markPrinted(dayId);

		return { markPrintedSuccess: true };
	}
} satisfies Actions;
