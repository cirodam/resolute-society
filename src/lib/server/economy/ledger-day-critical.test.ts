import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { performCloseDay } from './close-day';
import type { LedgerDayRow } from '$lib/server/infra/repositories';

function makeOpenDay(overrides: Partial<LedgerDayRow> = {}): LedgerDayRow {
	return {
		id: 'day-1',
		society_id: 'soc-1',
		date: '2026-06-09',
		page_number: 1,
		opening_balance: 100,
		closing_balance: 0,
		total_supply: 0,
		transaction_count: 0,
		status: 'open',
		closed_at: null,
		closed_by_id: null,
		closed_by_name: null,
		witnessed_by_id: null,
		witnessed_by_name: null,
		printed_at: null,
		archived_at: null,
		created_at: '2026-06-09T00:00:00.000Z',
		...overrides
	};
}

describe('ledger day close critical behavior', () => {
	it('second close fails predictably', async () => {
		let day = makeOpenDay();

		const closeWithState = async (params: { closingBalance: number; totalSupply: number; transactionCount: number; closedById: string; witnessedById: string | null; }) => {
			if (day.status !== 'open') return { closed: false };
			day = {
				...day,
				status: 'closed',
				closing_balance: params.closingBalance,
				total_supply: params.totalSupply,
				transaction_count: params.transactionCount,
				closed_by_id: params.closedById,
				witnessed_by_id: params.witnessedById,
				closed_at: '2026-06-09T10:00:00.000Z'
			};
			return { closed: true };
		};

		const first = await performCloseDay({
			today: '2026-06-09',
			closedById: 'person-1',
			witnessedById: null,
			getOpeningBalance: async () => 100,
			findOrCreateDay: async () => day,
			computeClosingBalance: async () => 80,
			computeTotalSupply: async () => 500,
			countTransactions: async () => 3,
			closeDay: async (params) => closeWithState(params),
			refetchDay: async () => day
		});
		assert.equal(first.ok, true);

		const second = await performCloseDay({
			today: '2026-06-09',
			closedById: 'person-1',
			witnessedById: null,
			getOpeningBalance: async () => 100,
			findOrCreateDay: async () => day,
			computeClosingBalance: async () => 70,
			computeTotalSupply: async () => 490,
			countTransactions: async () => 4,
			closeDay: async (params) => closeWithState(params),
			refetchDay: async () => day
		});

		assert.equal(second.ok, false);
		if (!second.ok) {
			assert.equal(second.code, 'ALREADY_CLOSED');
			assert.equal(second.message, "Today's ledger is already closed");
		}
	});

	it('closed day values remain unchanged after race-lost close attempt', async () => {
		const closedSnapshot = makeOpenDay({
			status: 'closed',
			closing_balance: 80,
			total_supply: 500,
			transaction_count: 3,
			closed_by_id: 'person-1',
			witnessed_by_id: 'person-2',
			closed_at: '2026-06-09T10:00:00.000Z'
		});
		let day = { ...closedSnapshot, status: 'open' as const };

		const result = await performCloseDay({
			today: '2026-06-09',
			closedById: 'person-3',
			witnessedById: null,
			getOpeningBalance: async () => 100,
			findOrCreateDay: async () => day,
			computeClosingBalance: async () => 60,
			computeTotalSupply: async () => 450,
			countTransactions: async () => 9,
			closeDay: async () => ({ closed: false }),
			refetchDay: async () => closedSnapshot
		});

		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.code, 'RACE_LOST');
		}

		assert.equal(closedSnapshot.closing_balance, 80);
		assert.equal(closedSnapshot.total_supply, 500);
		assert.equal(closedSnapshot.transaction_count, 3);
		assert.equal(closedSnapshot.closed_by_id, 'person-1');
		assert.equal(closedSnapshot.witnessed_by_id, 'person-2');
	});
});
