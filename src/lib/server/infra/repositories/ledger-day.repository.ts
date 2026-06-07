import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

export interface LedgerDayRow {
	id: string;
	society_id: string;
	date: string;
	page_number: number;
	opening_balance: number;
	closing_balance: number;
	total_supply: number;
	transaction_count: number;
	status: 'open' | 'closed' | 'archived';
	closed_at: string | null;
	closed_by_id: string | null;
	closed_by_name: string | null;
	witnessed_by_id: string | null;
	witnessed_by_name: string | null;
	printed_at: string | null;
	archived_at: string | null;
	created_at: string;
}

export interface CloseDayParams {
	dayId: string;
	closingBalance: number;
	totalSupply: number;
	transactionCount: number;
	closedById: string;
	witnessedById: string | null;
}

const DAY_SELECT = `
	SELECT
		ld.*,
		(cb.given_name || ' ' || cb.surname) AS closed_by_name,
		(wb.given_name || ' ' || wb.surname) AS witnessed_by_name
	FROM ledger_day ld
	LEFT JOIN person cb ON cb.id = ld.closed_by_id
	LEFT JOIN person wb ON wb.id = ld.witnessed_by_id
`;

export class LedgerDayRepository {
	constructor(private readonly database: Database.Database) {}

	findByDate(societyId: string, date: string): LedgerDayRow | null {
		return (
			(this.database
				.prepare(`${DAY_SELECT} WHERE ld.society_id = ? AND ld.date = ?`)
				.get(societyId, date) as LedgerDayRow | undefined) ?? null
		);
	}

	findLastClosed(societyId: string): LedgerDayRow | null {
		return (
			(this.database
				.prepare(
					`${DAY_SELECT}
					 WHERE ld.society_id = ? AND ld.status IN ('closed', 'archived')
					 ORDER BY ld.date DESC LIMIT 1`
				)
				.get(societyId) as LedgerDayRow | undefined) ?? null
		);
	}

	listRecent(societyId: string, limit: number): LedgerDayRow[] {
		return this.database
			.prepare(
				`${DAY_SELECT}
				 WHERE ld.society_id = ?
				 ORDER BY ld.date DESC
				 LIMIT ?`
			)
			.all(societyId, limit) as LedgerDayRow[];
	}

	findOrCreate(societyId: string, date: string, openingBalance: number): LedgerDayRow {
		const existing = this.findByDate(societyId, date);
		if (existing) return existing;

		const pageNumber = this.nextPageNumber(societyId);
		const id = randomUUID();
		this.database
			.prepare(
				`INSERT INTO ledger_day (id, society_id, date, page_number, opening_balance, status)
				 VALUES (?, ?, ?, ?, ?, 'open')`
			)
			.run(id, societyId, date, pageNumber, openingBalance);

		return this.findByDate(societyId, date)!;
	}

	close(params: CloseDayParams): void {
		this.database
			.prepare(
				`UPDATE ledger_day
				 SET status = 'closed',
				     closing_balance   = ?,
				     total_supply      = ?,
				     transaction_count = ?,
				     closed_at         = datetime('now'),
				     closed_by_id      = ?,
				     witnessed_by_id   = ?
				 WHERE id = ? AND status = 'open'`
			)
			.run(
				params.closingBalance,
				params.totalSupply,
				params.transactionCount,
				params.closedById,
				params.witnessedById,
				params.dayId
			);
	}

	markPrinted(dayId: string): void {
		this.database
			.prepare(`UPDATE ledger_day SET printed_at = datetime('now') WHERE id = ?`)
			.run(dayId);
	}

	private nextPageNumber(societyId: string): number {
		const result = this.database
			.prepare(`SELECT COALESCE(MAX(page_number), 0) + 1 AS next FROM ledger_day WHERE society_id = ?`)
			.get(societyId) as { next: number };
		return result.next;
	}
}
