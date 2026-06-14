import { fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requireSocietyTreasuryPermission } from '$lib/server/economy/policy';
import { sendFedTransfer } from '$lib/server/federation/p2p';
import { resolveSocietyMemberByHandle } from '$lib/server/economy/addressing';
import { disburseToResolvedPrincipal, hasSufficientBalance, isValidPositiveAmount } from '$lib/server/economy/disbursement';
import { getRepositories } from '$lib/server/infra/repositories';
import { withCriticalAction } from '$lib/server/http/critical-action';

export const transferActions = {
	transfer: withCriticalAction(async (event) => {
		const { request } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.transfer'
		});

		const data = await request.formData();
		const handle = data.get('handle')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!handle || !isValidPositiveAmount(amount))
			return fail(400, { transferError: 'Please enter a valid handle and amount' });

		const societyId = resolveSocietyId(undefined);

		if (!(await hasSufficientBalance('society', societyId, amount)))
			return fail(400, { transferError: 'Insufficient treasury balance' });

		const recipient = await resolveSocietyMemberByHandle(handle, societyId);
		if (!recipient)
			return fail(400, { transferError: 'Person or association not found with that handle' });

		await disburseToResolvedPrincipal({
			fromType: 'society',
			fromId: societyId,
			amount,
			recipient,
			note: `Treasury transfer to ${handle}`
		});

		return { transferSuccess: true, recipient: recipient.label, amount };
	}, {
		legacyKey: 'transferError',
		fallbackCode: 'TREASURY_TRANSFER_FAILED',
		fallbackMessage: 'Treasury transfer failed'
	}),

	transferFederationCredits: withCriticalAction(async (event) => {
		const { request } = event;
		requireSocietyTreasuryPermission({
			event,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'treasury.transfer'
		});

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { federationTransferError: 'Recipient principal is required' });
		if (!isValidPositiveAmount(amount)) return fail(400, { federationTransferError: 'Please enter a valid amount' });

		const repos = getRepositories();
		const society = await repos.societies.findDetailById(resolveSocietyId(undefined));
		if (!society) return fail(404, { federationTransferError: 'Society not found' });

		await sendFedTransfer({ fromPrincipal: `treasury@${society.handle}`, toPrincipal, amount });

		return { federationTransferSuccess: true, toPrincipal, amount };
	}, {
		legacyKey: 'federationTransferError',
		fallbackCode: 'TREASURY_FEDERATION_TRANSFER_FAILED',
		fallbackMessage: 'Federation transfer failed'
	})
};
