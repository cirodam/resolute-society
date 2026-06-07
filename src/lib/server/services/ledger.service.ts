import { getRepositories } from '../infra/repositories';
import type { EntityType } from '$lib/server/types';

export type { EntityType } from '$lib/server/types';

export async function calculateBalance(entityType: EntityType, entityId: string): Promise<number> {
	return getRepositories().ledger.calculateBalance(entityType, entityId);
}

export async function calculateBalances(type: EntityType, ids: string[]): Promise<Map<string, number>> {
	return getRepositories().ledger.calculateBalances(type, ids);
}

export async function calculateMoneySupply(societyId: string) {
	return getRepositories().ledger.calculateMoneySupply(societyId);
}

export async function checkSufficientBalance(
	entityType: EntityType,
	entityId: string,
	amount: number
): Promise<boolean> {
	return (await calculateBalance(entityType, entityId)) >= amount;
}

// Validated path for peer-to-peer transfers only. Do NOT use for minting (system/mint has no
// real balance and will always fail the check). Minting routes call repos.ledger.createTransaction
// directly to bypass this guard.
export async function createTransaction(params: {
	fromType: EntityType;
	fromId: string;
	toType: EntityType;
	toId: string;
	amount: number;
	note: string | null;
}): Promise<string> {
	if (!(await checkSufficientBalance(params.fromType, params.fromId, params.amount))) {
		throw new Error(
			`Insufficient balance: ${params.fromType} ${params.fromId} has less than ${params.amount} credits`
		);
	}
	return getRepositories().ledger.createTransaction(params);
}
