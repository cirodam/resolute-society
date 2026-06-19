import { calculateBalance, type EntityType } from '$lib/server/services/ledger.service';
import { createLedgerTransaction, runInRepositoryTransaction } from '$lib/server/economy/transactions';
import type { PrincipalBalance, PrincipalDeduction } from '$lib/server/economy/endowment';

export type { PrincipalBalance, PrincipalDeduction };
export type DemurrageMode = 'percent' | 'flat';

export function calculateDemurrageAmount(
	balance: number,
	mode: DemurrageMode,
	value: number
): number {
	if (balance <= 0 || value <= 0) return 0;
	if (mode === 'percent') return Math.round(Math.min(balance * (value / 100), balance) * 100) / 100;
	return Math.min(Math.round(value * 100) / 100, balance);
}

export function planDemurrageDeductions(
	principals: PrincipalBalance[],
	mode: DemurrageMode,
	value: number
): PrincipalDeduction[] {
	return principals
		.map((principal) => ({
			type: principal.type,
			id: principal.id,
			amount: calculateDemurrageAmount(principal.balance, mode, value)
		}))
		.filter((entry) => entry.amount > 0);
}

export async function executeDeductions(
	deductions: PrincipalDeduction[],
	target: { type: EntityType; id: string },
	note: string
): Promise<number> {
	let total = 0;
	await runInRepositoryTransaction(async (repositories) => {
		for (const deduction of deductions) {
			total += deduction.amount;
			await createLedgerTransaction(
				{
					fromType: deduction.type,
					fromId: deduction.id,
					toType: target.type,
					toId: target.id,
					amount: deduction.amount,
					note
				},
				repositories
			);
		}
	});
	return total;
}

export async function collectDemurrage(params: {
	principals: Array<{ type: EntityType; id: string }>;
	target: { type: EntityType; id: string };
	mode: DemurrageMode;
	value: number;
	note: string;
}): Promise<{ totalCollected: number; chargedPrincipalCount: number }> {
	const principalBalances: PrincipalBalance[] = await Promise.all(
		params.principals.map(async (principal) => ({
			...principal,
			balance: await calculateBalance(principal.type, principal.id)
		}))
	);

	const deductions = planDemurrageDeductions(principalBalances, params.mode, params.value);
	const totalCollected = await executeDeductions(deductions, params.target, params.note);

	return { totalCollected, chargedPrincipalCount: deductions.length };
}
