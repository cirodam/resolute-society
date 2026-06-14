import { db } from '$lib/server/infra/db';

export interface FedTxnEntry {
	id: string;
	from_principal: string;
	to_principal: string;
	amount: number;
	created_at: Date;
	direction: 'inbound' | 'outbound';
}

export async function getFedBalance(principal: string): Promise<number> {
	const [row] = await db()<{ balance: number }[]>`
		SELECT
			COALESCE((SELECT SUM(amount) FROM inbound_fed_txn  WHERE to_principal   = ${principal}), 0)
		  - COALESCE((SELECT SUM(amount) FROM outbound_fed_txn WHERE from_principal = ${principal} AND status = 'settled'), 0)
		  AS balance
	`;
	return Number(row?.balance ?? 0);
}

export async function getFedHistory(principal: string, limit = 50): Promise<FedTxnEntry[]> {
	return db()<FedTxnEntry[]>`
		SELECT id, from_principal, to_principal, amount,
		       received_at AS created_at, 'inbound'::text AS direction
		FROM inbound_fed_txn
		WHERE to_principal = ${principal}
		UNION ALL
		SELECT id, from_principal, to_principal, amount,
		       created_at, 'outbound'::text AS direction
		FROM outbound_fed_txn
		WHERE from_principal = ${principal} AND status = 'settled'
		ORDER BY created_at DESC
		LIMIT ${limit}
	`;
}
