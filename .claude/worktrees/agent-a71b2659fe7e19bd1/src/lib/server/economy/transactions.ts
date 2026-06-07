import type { EntityType } from '$lib/server/types';
import { createTransaction as serviceCreateTransaction } from '$lib/server/services/ledger.service';

export function createLedgerTransaction(params: {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string;
}): string {
	return serviceCreateTransaction(params);
}
