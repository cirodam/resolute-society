import type { EntityType } from '$lib/server/types';

export const MEMBER_ENDOWMENT = 60_000;

export type PrincipalBalance = {
	type: EntityType;
	id: string;
	balance: number;
};

export type PrincipalDeduction = {
	type: EntityType;
	id: string;
	amount: number;
};

export function calculateAgeYears(dob: string | null, nowMs = Date.now()): number {
	if (!dob) return 0;
	const dobMs = new Date(dob).getTime();
	if (Number.isNaN(dobMs)) return 0;
	return Math.max(0, Math.floor((nowMs - dobMs) / (365.25 * 24 * 60 * 60 * 1000)));
}

export function calculateExpectedSupply(memberCount: number): number {
	return memberCount * MEMBER_ENDOWMENT;
}

export function planProportionalBurn(
	principals: PrincipalBalance[],
	targetBurnAmount: number
): { deductions: PrincipalDeduction[]; burnAmount: number } {
	const positive = principals.filter((principal) => principal.balance > 0);
	if (positive.length === 0 || targetBurnAmount <= 0) {
		return { deductions: [], burnAmount: 0 };
	}

	const totalPositive = positive.reduce((sum, principal) => sum + principal.balance, 0);
	const burnAmount = Math.min(targetBurnAmount, totalPositive);

	const deductions: PrincipalDeduction[] = [];
	let allocated = 0;

	for (let index = 0; index < positive.length; index++) {
		const principal = positive[index];
		const isLast = index === positive.length - 1;

		const amount = isLast
			? Math.max(0, burnAmount - allocated)
			: Math.min(principal.balance, burnAmount * (principal.balance / totalPositive));

		if (amount > 0) {
			deductions.push({
				type: principal.type,
				id: principal.id,
				amount
			});
			allocated += amount;
		}
	}

	return { deductions, burnAmount };
}