import { fail } from '@sveltejs/kit';
import type { ActionFailure } from '@sveltejs/kit';
import type { LedgerDayRow } from '$lib/server/infra/repositories';

export type CloseDayOutcome =
	| {
			ok: true;
			date: string;
			pageNumber: number;
	  }
	| {
			ok: false;
			failure: ActionFailure<{
				closeDayError: string;
				closeDayCode: 'ALREADY_CLOSED' | 'RACE_LOST';
				date: string;
			}>;
	  };

export async function performCloseDay(params: {
	today: string;
	closedById: string;
	witnessedById: string | null;
	getOpeningBalance: () => Promise<number>;
	findOrCreateDay: (openingBalance: number) => Promise<LedgerDayRow>;
	computeClosingBalance: () => Promise<number>;
	computeTotalSupply: () => Promise<number>;
	countTransactions: () => Promise<number>;
	closeDay: (input: {
		dayId: string;
		closingBalance: number;
		totalSupply: number;
		transactionCount: number;
		closedById: string;
		witnessedById: string | null;
	}) => Promise<{ closed: boolean }>;
	refetchDay: () => Promise<LedgerDayRow | null>;
}): Promise<CloseDayOutcome> {
	const openingBalance = await params.getOpeningBalance();
	const day = await params.findOrCreateDay(openingBalance);

	if (day.status === 'closed' || day.status === 'archived') {
		return {
			ok: false,
			failure: fail(400, {
				closeDayError: "Today's ledger is already closed",
				closeDayCode: 'ALREADY_CLOSED',
				date: params.today
			})
		};
	}

	const [closingBalance, totalSupply, transactionCount] = await Promise.all([
		params.computeClosingBalance(),
		params.computeTotalSupply(),
		params.countTransactions()
	]);

	const closeResult = await params.closeDay({
		dayId: day.id,
		closingBalance,
		totalSupply,
		transactionCount,
		closedById: params.closedById,
		witnessedById: params.witnessedById
	});

	if (!closeResult.closed) {
		const refreshed = await params.refetchDay();
		if (refreshed && (refreshed.status === 'closed' || refreshed.status === 'archived')) {
			return {
				ok: false,
				failure: fail(409, {
					closeDayError: 'Ledger close already completed by another request',
					closeDayCode: 'RACE_LOST',
					date: params.today
				})
			};
		}

		return {
			ok: false,
			failure: fail(409, {
				closeDayError: 'Ledger close could not be completed',
				closeDayCode: 'RACE_LOST',
				date: params.today
			})
		};
	}

	return {
		ok: true,
		date: params.today,
		pageNumber: day.page_number
	};
}
