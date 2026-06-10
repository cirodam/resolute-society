import { getRepositories } from '$lib/server/infra/repositories';
import { calculateBalance } from '$lib/server/services/ledger.service';
import {
	createLedgerTransaction,
	createSystemLedgerTransaction,
	runInRepositoryTransaction
} from '$lib/server/economy/transactions';
import { calculateExpectedSupply, planProportionalBurn } from './endowment';

export type SupplySnapshot = {
	totalSupply: number;
	expectedSupply: number;
	supplyExcess: number;
	supplyShortfall: number;
};

export async function getSupplySnapshot(societyId: string): Promise<SupplySnapshot> {
	const repositories = getRepositories();
	const summary = await repositories.treasury.calculateSummary(societyId);
	const expectedSupply = calculateExpectedSupply(await repositories.people.listEndowmentMembers(societyId));

	return {
		totalSupply: summary.totalSupply,
		expectedSupply,
		supplyExcess: Math.max(0, summary.totalSupply - expectedSupply),
		supplyShortfall: Math.max(0, expectedSupply - summary.totalSupply)
	};
}

export async function reconcileEndowmentMint(societyId: string): Promise<{
	minted: number;
	expectedSupply: number;
	totalSupply: number;
}> {
	const repositories = getRepositories();
	const snapshot = await getSupplySnapshot(societyId);

	if (snapshot.supplyShortfall <= 0) {
		return {
			minted: 0,
			expectedSupply: snapshot.expectedSupply,
			totalSupply: snapshot.totalSupply
		};
	}

	await createSystemLedgerTransaction({
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

export async function runSupplyReconciliationDemurrage(societyId: string): Promise<{
	burned: number;
	remainingExcess: number;
	expectedSupply: number;
	totalSupply: number;
	principalCount: number;
}> {
	const repositories = getRepositories();
	const snapshot = await getSupplySnapshot(societyId);

	if (snapshot.supplyExcess <= 0) {
		return {
			burned: 0,
			remainingExcess: 0,
			expectedSupply: snapshot.expectedSupply,
			totalSupply: snapshot.totalSupply,
			principalCount: 0
		};
	}

	const people = await repositories.treasury.listSocietyPrincipals(societyId);
	const associations = await repositories.treasury.listSocietyAssociations(societyId);
	const principalBalances = [
		...(await Promise.all(people.map(async (person) => ({
			type: 'person' as const,
			id: person.id,
			balance: await calculateBalance('person', person.id)
		})))),
		...(await Promise.all(associations.map(async (association) => ({
			type: 'association' as const,
			id: association.id,
			balance: await calculateBalance('association', association.id)
		}))))
	];

	const { deductions, burnAmount } = planProportionalBurn(principalBalances, snapshot.supplyExcess);
	await runInRepositoryTransaction(async (repositories) => {
		for (const deduction of deductions) {
			await createLedgerTransaction(
				{
					fromType: deduction.type,
					fromId: deduction.id,
					toType: 'system',
					toId: 'burn',
					amount: deduction.amount,
					note: 'Supply reconciliation demurrage'
				},
				repositories
			);
		}
	});

	return {
		burned: burnAmount,
		remainingExcess: Math.max(0, snapshot.supplyExcess - burnAmount),
		expectedSupply: snapshot.expectedSupply,
		totalSupply: snapshot.totalSupply - burnAmount,
		principalCount: deductions.length
	};
}
