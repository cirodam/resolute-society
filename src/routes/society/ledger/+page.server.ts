import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const today = new Date().toISOString().slice(0, 10);

	return {
		society,
		today,
		todayRecord: await repos.ledgerDays.findByDate(societyId, today),
		recentDays: await repos.ledgerDays.listRecent(societyId, 30),
		transactions: await repos.ledger.listSocietyTransactions(societyId),
		members: await repos.treasury.listSocietyMembers(societyId)
	};
};

export const actions = {
	closeDay: async (event) => {
		await requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const witnessedById = data.get('witnessed_by_id')?.toString() || null;

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const today = new Date().toISOString().slice(0, 10);

		const lastClosed = await repos.ledgerDays.findLastClosed(societyId);
		const openingBalance = lastClosed
			? lastClosed.closing_balance
			: await calculateBalance('society', societyId);

		const day = await repos.ledgerDays.findOrCreate(societyId, today, openingBalance);

		if (day.status === 'closed' || day.status === 'archived') {
			return fail(400, { closeDayError: "Today's ledger is already closed" });
		}

		const closingBalance = await calculateBalance('society', societyId);
		const summary = await repos.treasury.calculateSummary(societyId);
		const transactionCount = await repos.ledger.countForDate(today);

		await repos.ledgerDays.close({
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
		await requirePermission(event, 'ledger.close_day', resolveSocietyId(undefined));

		const data = await event.request.formData();
		const dayId = data.get('day_id')?.toString();

		if (!dayId) return fail(400, { markPrintedError: 'Day ID required' });

		await getRepositories().ledgerDays.markPrinted(dayId);

		return { markPrintedSuccess: true };
	}
} satisfies Actions;
