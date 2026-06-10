import { calculateBalance, type EntityType } from '$lib/server/services/ledger.service';
import { createLedgerTransaction, runInRepositoryTransaction } from '$lib/server/economy/transactions';

export type DemurrageMode = 'percent' | 'flat';

export type PrincipalBalance = {
	type: EntityType;
	id: string;
	balance: number;
};

export type DemurrageDeduction = {
	type: EntityType;
	id: string;
	amount: number;
};

export function calculateDemurrageAmount(
	balance: number,
	mode: DemurrageMode,
	value: number
): number {
	if (balance <= 0 || value <= 0) return 0;
	if (mode === 'percent') return balance * (value / 100);
	return Math.min(value, balance);
}

export function planDemurrageDeductions(
	principals: PrincipalBalance[],
	mode: DemurrageMode,
	value: number
): DemurrageDeduction[] {
	return principals
		.map((principal) => ({
			type: principal.type,
			id: principal.id,
			amount: calculateDemurrageAmount(principal.balance, mode, value)
		}))
		.filter((entry) => entry.amount > 0);
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

	let totalCollected = 0;
	await runInRepositoryTransaction(async (repositories) => {
		for (const deduction of deductions) {
			totalCollected += deduction.amount;
			await createLedgerTransaction(
				{
					fromType: deduction.type,
					fromId: deduction.id,
					toType: params.target.type,
					toId: params.target.id,
					amount: deduction.amount,
					note: params.note
				},
				repositories
			);
		}
	});

	return {
		totalCollected,
		chargedPrincipalCount: deductions.length
	};
}
