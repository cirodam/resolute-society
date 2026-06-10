import type postgres from 'postgres';
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

export interface CloseDayResult {
	closed: boolean;
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
	constructor(private readonly sql: postgres.Sql) {}

	async findByDate(societyId: string, date: string): Promise<LedgerDayRow | null> {
		const [row] = await this.sql<LedgerDayRow[]>`
			${this.sql.unsafe(DAY_SELECT)} WHERE ld.society_id = ${societyId} AND ld.date = ${date}`;
		return row ?? null;
	}

	async findLastClosed(societyId: string): Promise<LedgerDayRow | null> {
		const [row] = await this.sql<LedgerDayRow[]>`
			${this.sql.unsafe(DAY_SELECT)}
			WHERE ld.society_id = ${societyId} AND ld.status IN ('closed', 'archived')
			ORDER BY ld.date DESC LIMIT 1`;
		return row ?? null;
	}

	async listRecent(societyId: string, limit: number): Promise<LedgerDayRow[]> {
		return await this.sql<LedgerDayRow[]>`
			${this.sql.unsafe(DAY_SELECT)}
			WHERE ld.society_id = ${societyId}
			ORDER BY ld.date DESC
			LIMIT ${limit}`;
	}

	async findOrCreate(societyId: string, date: string, openingBalance: number): Promise<LedgerDayRow> {
		const existing = await this.findByDate(societyId, date);
		if (existing) return existing;

		const pageNumber = await this.nextPageNumber(societyId);
		const id = randomUUID();
		await this.sql`
			INSERT INTO ledger_day (id, society_id, date, page_number, opening_balance, status)
			VALUES (${id}, ${societyId}, ${date}, ${pageNumber}, ${openingBalance}, 'open')`;

		return (await this.findByDate(societyId, date))!;
	}

	async close(params: CloseDayParams): Promise<CloseDayResult> {
		const result = await this.sql`
			UPDATE ledger_day
			SET status = 'closed',
			    closing_balance   = ${params.closingBalance},
			    total_supply      = ${params.totalSupply},
			    transaction_count = ${params.transactionCount},
			    closed_at         = NOW(),
			    closed_by_id      = ${params.closedById},
			    witnessed_by_id   = ${params.witnessedById}
			WHERE id = ${params.dayId} AND status = 'open'`;

		return { closed: result.count > 0 };
	}

	async markPrinted(dayId: string): Promise<void> {
		await this.sql`UPDATE ledger_day SET printed_at = NOW() WHERE id = ${dayId}`;
	}

	private async nextPageNumber(societyId: string): Promise<number> {
		const [result] = await this.sql<Array<{ next: number }>>`
			SELECT (COALESCE(MAX(page_number), 0) + 1)::int AS next FROM ledger_day WHERE society_id = ${societyId}`;
		return result.next;
	}
}
