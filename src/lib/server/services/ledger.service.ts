import { getRepositories } from '../infra/repositories';
import type { EntityType } from '$lib/server/types';

export type { EntityType } from '$lib/server/types';

export function calculateBalance(entityType: EntityType, entityId: string): number {
	return getRepositories().ledger.calculateBalance(entityType, entityId);
}

export function calculateBalances(type: EntityType, ids: string[]): Map<string, number> {
	return getRepositories().ledger.calculateBalances(type, ids);
}

export function calculateMoneySupply(societyId: string) {
	return getRepositories().ledger.calculateMoneySupply(societyId);
}

export function checkSufficientBalance(
	entityType: EntityType,
	entityId: string,
	amount: number
): boolean {
	return calculateBalance(entityType, entityId) >= amount;
}

// Validated path for peer-to-peer transfers only. Do NOT use for minting (system/mint has no
// real balance and will always fail the check). Minting routes call repos.ledger.createTransaction
// directly to bypass this guard.
export function createTransaction(params: {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}): string {
	if (!checkSufficientBalance(params.fromType, params.fromId, params.amount)) {
		throw new Error(
			`Insufficient balance: ${params.fromType} ${params.fromId} has less than ${params.amount} credits`
		);
	}
	return getRepositories().ledger.createTransaction(params);
}
