import { calculateBalance, type EntityType } from '$lib/server/services/ledger.service';
import { createLedgerTransaction } from '$lib/server/economy/transactions';
import type { ResolvedPrincipal } from '$lib/server/economy/addressing';

export function isValidPositiveAmount(amount: number): boolean {
	return Number.isFinite(amount) && amount > 0;
}

export function hasSufficientBalance(
	entityType: EntityType,
	entityId: string,
	amount: number
): boolean {
	return calculateBalance(entityType, entityId) >= amount;
}

export function disburseToResolvedPrincipal(params: {
	fromType: EntityType;
	fromId: string;
	amount: number;
	recipient: ResolvedPrincipal;
	note: string;
}): string {
	return createLedgerTransaction({
		fromType: params.fromType,
		fromId: params.fromId,
		toType: params.recipient.type,
		toId: params.recipient.id,
		amount: params.amount,
		note: params.note
	});
}
