import { getRepositories } from '$lib/server/infra/repositories';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { calculateExpectedSupply, planProportionalBurn } from './endowment';

export type SupplySnapshot = {
	totalSupply: number;
	expectedSupply: number;
	supplyExcess: number;
	supplyShortfall: number;
};

export function getSupplySnapshot(societyId: string): SupplySnapshot {
	const repositories = getRepositories();
	const summary = repositories.treasury.calculateSummary(societyId);
	const expectedSupply = calculateExpectedSupply(repositories.people.listEndowmentMembers(societyId));

	return {
		totalSupply: summary.totalSupply,
		expectedSupply,
		supplyExcess: Math.max(0, summary.totalSupply - expectedSupply),
		supplyShortfall: Math.max(0, expectedSupply - summary.totalSupply)
	};
}

export function reconcileEndowmentMint(societyId: string): {
	minted: number;
	expectedSupply: number;
	totalSupply: number;
} {
	const repositories = getRepositories();
	const snapshot = getSupplySnapshot(societyId);

	if (snapshot.supplyShortfall <= 0) {
		return {
			minted: 0,
			expectedSupply: snapshot.expectedSupply,
			totalSupply: snapshot.totalSupply
		};
	}

	repositories.ledger.createTransaction({
		fromType: 'system',
		fromId: 'mint',
		toType: 'society',
		toId: societyId,
		amount: snapshot.supplyShortfall,
		note: 'Endowment reconciliation mint'
	});

	return {
		minted: snapshot.supplyShortfall,
		expectedSupply: snapshot.expectedSupply,
		totalSupply: snapshot.totalSupply + snapshot.supplyShortfall
	};
}

export function runSupplyReconciliationDemurrage(societyId: string): {
	burned: number;
	remainingExcess: number;
	expectedSupply: number;
	totalSupply: number;
	principalCount: number;
} {
	const repositories = getRepositories();
	const snapshot = getSupplySnapshot(societyId);

	if (snapshot.supplyExcess <= 0) {
		return {
			burned: 0,
			remainingExcess: 0,
			expectedSupply: snapshot.expectedSupply,
			totalSupply: snapshot.totalSupply,
			principalCount: 0
		};
	}

	const people = repositories.treasury.listSocietyPrincipals(societyId);
	const associations = repositories.treasury.listSocietyAssociations(societyId);
	const principalBalances = [
		...people.map((person) => ({
			type: 'person' as const,
			id: person.id,
			balance: calculateBalance('person', person.id)
		})),
		...associations.map((association) => ({
			type: 'association' as const,
			id: association.id,
			balance: calculateBalance('association', association.id)
		}))
	];

	const { deductions, burnAmount } = planProportionalBurn(principalBalances, snapshot.supplyExcess);
	for (const deduction of deductions) {
		repositories.ledger.createTransaction({
			fromType: deduction.type,
			fromId: deduction.id,
			toType: 'system',
			toId: 'burn',
			amount: deduction.amount,
			note: 'Supply reconciliation demurrage'
		});
	}

	return {
		burned: burnAmount,
		remainingExcess: Math.max(0, snapshot.supplyExcess - burnAmount),
		expectedSupply: snapshot.expectedSupply,
		totalSupply: snapshot.totalSupply - burnAmount,
		principalCount: deductions.length
	};
}
