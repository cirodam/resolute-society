import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findDetailById(societyId);

	if (!society) throw error(404, 'Society not found');

	const [inbound, outbound] = await Promise.all([
		repos.inboundFedTxns.listAll(),
		repos.outboundFedTxns.listAll()
	]);

	const totalMinted = inbound
		.filter((t) => t.from_principal === 'mint@federation')
		.reduce((s, t) => s + t.amount, 0);

	const totalReceivedFromPeers = inbound
		.filter((t) => t.from_principal !== 'mint@federation')
		.reduce((s, t) => s + t.amount, 0);

	const totalSentSettled = outbound
		.filter((t) => t.status === 'settled')
		.reduce((s, t) => s + t.amount, 0);

	const totalSentPending = outbound
		.filter((t) => t.status === 'pending')
		.reduce((s, t) => s + t.amount, 0);

	return {
		society,
		inbound,
		outbound,
		summary: { totalMinted, totalReceivedFromPeers, totalSentSettled, totalSentPending }
	};
};
