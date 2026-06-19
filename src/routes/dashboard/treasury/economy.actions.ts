import { fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { collectDemurrage, type DemurrageMode } from '$lib/server/economy/demurrage';
import { reconcileEndowmentMint, runSupplyReconciliationDemurrage, runFedSupplyReconciliationBurn } from '$lib/server/economy/reconciliation';
import { LedgerTransactionValidationError, LEDGER_TRANSACTION_ERROR } from '$lib/server/services/ledger.service';
import { getRepositories } from '$lib/server/infra/repositories';
import { withCriticalAction } from '$lib/server/http/critical-action';

export const demurrageAction = {
	runDemurrage: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, 'treasury.run_demurrage', resolveSocietyId(undefined));

		const data = await request.formData();
		const modeRaw = data.get('mode')?.toString();
		const value = parseFloat(data.get('value')?.toString() || '0');

		if (value <= 0) return fail(400, { error: 'Please enter a valid amount' });

		let demurrageMode: DemurrageMode;
		if (modeRaw === 'percent' || modeRaw === 'flat') {
			demurrageMode = modeRaw;
		} else {
			return fail(400, { error: 'Please enter a valid amount' });
		}

		const repositories = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const people = await repositories.treasury.listSocietyPrincipals(societyId);
		const associations = await repositories.treasury.listSocietyAssociations(societyId);

		let totalCollected: number;
		try {
			const result = await collectDemurrage({
				principals: [
					...people.map((p) => ({ type: 'person' as const, id: p.id })),
					...associations.map((a) => ({ type: 'association' as const, id: a.id }))
				],
				target: { type: 'society', id: societyId },
				mode: demurrageMode,
				value,
				note: `Demurrage: ${demurrageMode === 'percent' ? value + '%' : value + ' per principal'}`
			});
			totalCollected = result.totalCollected;
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE)
					return fail(400, { error: 'Insufficient balance for one or more principals' });
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT)
					return fail(400, { error: 'Demurrage amount must be greater than zero' });
			}
			return fail(500, { error: 'Demurrage batch failed and was rolled back' });
		}

		return { success: true, collected: totalCollected, principalCount: people.length + associations.length };
	}, {
		legacyKey: 'error',
		fallbackCode: 'TREASURY_DEMURRAGE_FAILED',
		fallbackMessage: 'Demurrage action failed'
	})
};

export const reconciliationActions = {
	reconcileEndowmentMint: withCriticalAction(async (event) => {
		await requirePermission(event, 'treasury.run_demurrage', resolveSocietyId(undefined));
		const result = await reconcileEndowmentMint(resolveSocietyId(undefined));
		return {
			endowmentMintSuccess: true,
			minted: result.minted,
			expectedSupply: result.expectedSupply,
			totalSupply: result.totalSupply
		};
	}, {
		legacyKey: 'error',
		fallbackCode: 'TREASURY_ENDOWMENT_MINT_FAILED',
		fallbackMessage: 'Endowment reconciliation mint failed'
	}),

	runSupplyReconciliationDemurrage: withCriticalAction(async (event) => {
		await requirePermission(event, 'treasury.run_demurrage', resolveSocietyId(undefined));

		let result: Awaited<ReturnType<typeof runSupplyReconciliationDemurrage>>;
		try {
			result = await runSupplyReconciliationDemurrage(resolveSocietyId(undefined));
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE)
					return fail(400, { supplyReconcileError: 'Insufficient balance for reconciliation demurrage' });
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT)
					return fail(400, { supplyReconcileError: 'Reconciliation amount must be greater than zero' });
			}
			return fail(500, { supplyReconcileError: 'Supply reconciliation batch failed and was rolled back' });
		}

		return {
			supplyReconcileSuccess: true,
			burned: result.burned,
			remainingExcess: result.remainingExcess,
			expectedSupply: result.expectedSupply,
			totalSupply: result.totalSupply,
			principalCount: result.principalCount
		};
	}, {
		legacyKey: 'supplyReconcileError',
		fallbackCode: 'TREASURY_SUPPLY_RECONCILE_FAILED',
		fallbackMessage: 'Supply reconciliation demurrage failed'
	}),

	runFedSupplyReconciliationBurn: withCriticalAction(async (event) => {
		await requirePermission(event, 'treasury.run_demurrage', resolveSocietyId(undefined));
		const result = await runFedSupplyReconciliationBurn(resolveSocietyId(undefined));
		return {
			fedBurnSuccess: true,
			burned: result.burned,
			remainingExcess: result.remainingExcess,
			expectedSupply: result.expectedSupply,
			totalFedSupply: result.totalFedSupply
		};
	}, {
		legacyKey: 'fedBurnError',
		fallbackCode: 'TREASURY_FED_BURN_FAILED',
		fallbackMessage: 'Federation supply burn failed'
	})
};
