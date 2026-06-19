import { fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requireSocietyTreasuryPermission } from '$lib/server/economy/policy';
import { sendFedTransfer } from '$lib/server/federation/p2p';
import { resolveAddress, parseAddress } from '$lib/server/economy/addressing';
import { disburseToResolvedPrincipal, hasSufficientBalance, isValidPositiveAmount } from '$lib/server/economy/disbursement';
import { getRepositories } from '$lib/server/infra/repositories';
import { withCriticalAction } from '$lib/server/http/critical-action';

const RESOLVE_ERROR_MESSAGES = {
	malformed: 'Invalid address format',
	unknown: 'No person or association found with that address',
	ambiguous: 'That address matches more than one principal',
	'out-of-scope': 'Cross-society transfers require a federation transfer'
} as const;

export const transferActions = {
	transfer: withCriticalAction(async (event) => {
		const { request } = event;
		const societyId = resolveSocietyId(undefined);
		requireSocietyTreasuryPermission({ event, societyId, permissionCode: 'treasury.transfer' });

		const data = await request.formData();
		const handle = data.get('handle')?.toString();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!handle || !isValidPositiveAmount(amount))
			return fail(400, { transferError: 'Please enter a valid handle and amount' });

		const repos = getRepositories();
		const society = await repos.societies.findDetailById(societyId);
		if (!society) return fail(500, { transferError: 'Society not found' });

		if (!(await hasSufficientBalance('society', societyId, amount)))
			return fail(400, { transferError: 'Insufficient treasury balance' });

		const resolved = await resolveAddress(handle, { societyId, societyHandle: society.handle });
		if (!resolved.ok)
			return fail(400, { transferError: RESOLVE_ERROR_MESSAGES[resolved.error] });

		await disburseToResolvedPrincipal({
			fromType: 'society',
			fromId: societyId,
			amount,
			recipient: resolved.principal,
			note: `Treasury transfer to ${handle}`
		});

		return { transferSuccess: true, recipient: resolved.principal.label, amount };
	}, {
		legacyKey: 'transferError',
		fallbackCode: 'TREASURY_TRANSFER_FAILED',
		fallbackMessage: 'Treasury transfer failed'
	}),

	transferFederationCredits: withCriticalAction(async (event) => {
		const { request } = event;
		const societyId = resolveSocietyId(undefined);
		requireSocietyTreasuryPermission({ event, societyId, permissionCode: 'treasury.transfer' });

		const data = await request.formData();
		const toPrincipal = data.get('toPrincipal')?.toString().trim();
		const amount = parseFloat(data.get('amount')?.toString() || '0');

		if (!toPrincipal) return fail(400, { federationTransferError: 'Recipient principal is required' });
		if (!isValidPositiveAmount(amount)) return fail(400, { federationTransferError: 'Please enter a valid amount' });

		const parsedTo = parseAddress(toPrincipal);
		if (parsedTo.form !== 'handle' || parsedTo.kind !== 'qualified')
			return fail(400, { federationTransferError: 'Recipient must be in handle@society format (e.g. alice@athensga)' });

		const repos = getRepositories();
		const society = await repos.societies.findDetailById(societyId);
		if (!society) return fail(404, { federationTransferError: 'Society not found' });

		const targetSocietyHandle = parsedTo.society;
		const isLocalSociety = targetSocietyHandle === society.handle;
		const peer = isLocalSociety ? null : await repos.peerSocieties.findByHandle(targetSocietyHandle);
		if (!isLocalSociety && !peer)
			return fail(400, { federationTransferError: `Unknown society: ${targetSocietyHandle}` });

		await sendFedTransfer({ fromPrincipal: `treasury@${society.handle}`, toPrincipal, amount });

		return { federationTransferSuccess: true, toPrincipal, amount };
	}, {
		legacyKey: 'federationTransferError',
		fallbackCode: 'TREASURY_FEDERATION_TRANSFER_FAILED',
		fallbackMessage: 'Federation transfer failed'
	})
};
