import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import {
	createLedgerTransaction,
	createSystemLedgerTransaction,
	runInRepositoryTransaction
} from '$lib/server/economy/transactions';
import { MEMBER_ENDOWMENT, calculateExpectedSupply, planProportionalBurn } from './endowment';

export type SupplySnapshot = {
	totalSupply: number;
	expectedSupply: number;
	supplyExcess: number;
	supplyShortfall: number;
};

export async function getSupplySnapshot(societyId: string): Promise<SupplySnapshot> {
	const repositories = getRepositories();
	const summary = await repositories.treasury.calculateSummary(societyId);
	const memberCount = await repositories.treasury.getMemberCount(societyId);
	const expectedSupply = calculateExpectedSupply(memberCount);

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

export async function reconcileFedMint(societyId: string): Promise<{
	minted: number;
	expectedSupply: number;
	totalFedSupply: number;
}> {
	const repositories = getRepositories();
	const society = await repositories.societies.findDetailById(societyId);
	if (!society) throw new Error(`Society not found: ${societyId}`);

	const memberCount = await repositories.treasury.getMemberCount(societyId);
	const expectedSupply = calculateExpectedSupply(memberCount);
	const totalFedSupply = await repositories.fedLedger.getTotalFedSupplyForSociety(society.handle);
	const shortfall = Math.max(0, expectedSupply - totalFedSupply);

	if (shortfall <= 0) {
		return { minted: 0, expectedSupply, totalFedSupply };
	}

	await repositories.inboundFedTxns.create({
		id: randomUUID(),
		fromPrincipal: 'mint@federation',
		toPrincipal: `treasury@${society.handle}`,
		amount: shortfall
	});

	return { minted: shortfall, expectedSupply, totalFedSupply };
}

export async function runFedSupplyReconciliationBurn(societyId: string): Promise<{
	burned: number;
	remainingExcess: number;
	expectedSupply: number;
	totalFedSupply: number;
}> {
	const repositories = getRepositories();
	const society = await repositories.societies.findDetailById(societyId);
	if (!society) throw new Error(`Society not found: ${societyId}`);

	const memberCount = await repositories.treasury.getMemberCount(societyId);
	const expectedSupply = calculateExpectedSupply(memberCount);
	const totalFedSupply = await repositories.fedLedger.getTotalFedSupplyForSociety(society.handle);
	const excess = Math.max(0, totalFedSupply - expectedSupply);

	if (excess <= 0) {
		return { burned: 0, remainingExcess: 0, expectedSupply, totalFedSupply };
	}

	await repositories.outboundFedTxns.create({
		id: randomUUID(),
		fromPrincipal: `treasury@${society.handle}`,
		toPrincipal: 'burn@federation',
		amount: excess
	});

	return {
		burned: excess,
		remainingExcess: 0,
		expectedSupply,
		totalFedSupply
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

	const [personBalances, associationBalances] = await Promise.all([
		repositories.ledger.calculateBalances('person', people.map((p) => p.id)),
		repositories.ledger.calculateBalances('association', associations.map((a) => a.id))
	]);

	const principalBalances = [
		...people.map((p) => ({ type: 'person' as const, id: p.id, balance: personBalances.get(p.id) ?? 0 })),
		...associations.map((a) => ({ type: 'association' as const, id: a.id, balance: associationBalances.get(a.id) ?? 0 }))
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
