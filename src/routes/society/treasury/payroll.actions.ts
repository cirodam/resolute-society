import { fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { requireSocietyTreasuryPermission } from '$lib/server/economy/policy';
import { calculateBalance, LedgerTransactionValidationError, LEDGER_TRANSACTION_ERROR } from '$lib/server/services/ledger.service';
import { createLedgerTransaction, runInRepositoryTransaction } from '$lib/server/economy/transactions';
import { getRepositories } from '$lib/server/infra/repositories';
import { withCriticalAction } from '$lib/server/http/critical-action';

export const payrollActions = {
	runPositionPayroll: withCriticalAction(async (event) => {
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.run_position_payroll'
		});

		const societyId = resolveSocietyId(undefined);
		const repositories = getRepositories();
		const positions = await repositories.positions.listPayrollCandidates();

		if (positions.length === 0) return fail(400, { payrollError: 'No positions to pay' });

		const totalPayroll = positions.reduce((sum, p) => sum + p.current_allowance, 0);
		const societyBalance = await calculateBalance('society', societyId);
		if (societyBalance < totalPayroll) {
			return fail(400, {
				payrollError: `Insufficient funds. Need ${totalPayroll} credits, have ${societyBalance}`
			});
		}

		try {
			await runInRepositoryTransaction(async (repos) => {
				for (const position of positions) {
					await createLedgerTransaction(
						{ fromType: 'society', fromId: societyId, toType: 'person', toId: position.current_person_id, amount: position.current_allowance, note: `Payroll: ${position.name}` },
						repos
					);
				}
			});
		} catch (err) {
			if (err instanceof LedgerTransactionValidationError) {
				if (err.code === LEDGER_TRANSACTION_ERROR.INSUFFICIENT_BALANCE)
					return fail(400, { payrollError: 'Insufficient treasury balance' });
				if (err.code === LEDGER_TRANSACTION_ERROR.NON_POSITIVE_AMOUNT)
					return fail(400, { payrollError: 'Payroll allowance must be greater than zero' });
			}
			return fail(500, { payrollError: 'Payroll batch failed and was rolled back' });
		}

		return { payrollSuccess: true, paidCount: positions.length, totalAmount: totalPayroll };
	}, {
		legacyKey: 'payrollError',
		fallbackCode: 'TREASURY_PAYROLL_FAILED',
		fallbackMessage: 'Payroll run failed'
	}),

	adjustPositionAllowance: withCriticalAction(async (event) => {
		const { request } = event;
		await requirePermission(event, 'treasury.adjust_position_allowance', resolveSocietyId(undefined));
		const data = await request.formData();
		const positionId = data.get('position_id')?.toString();
		const newAllowance = parseFloat(data.get('current_allowance')?.toString() || '0');
		const reason = data.get('reason')?.toString() || null;

		if (!positionId || newAllowance < 0) return fail(400, { adjustAllowanceError: 'Invalid input' });

		await getRepositories().positions.updateAllowance({ positionId, newAllowance, reason });

		return { adjustAllowanceSuccess: true };
	}, {
		legacyKey: 'adjustAllowanceError',
		fallbackCode: 'TREASURY_ADJUST_ALLOWANCE_FAILED',
		fallbackMessage: 'Adjust position allowance failed'
	})
};
