import { getRepositories } from '../infra/repositories';
import type { OutboundFedTxnRow } from '../infra/repositories/outbound-fed-txn.repository';
import { canonicalTransferData, signData } from './crypto';
import { executeExternalFetch } from '$lib/server/http/external-fetch';

const P2P_TIMEOUT_MS = 5000;

export async function sendFedTransfer(params: {
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
}): Promise<{ id: string; settled: boolean }> {
	const { fromPrincipal, toPrincipal, amount } = params;

	const repos = getRepositories();
	const id = crypto.randomUUID();
	await repos.outboundFedTxns.create({ id, fromPrincipal, toPrincipal, amount });

	const txn = (await repos.outboundFedTxns.findById(id))!;
	try {
		await deliverOutboundFedTxn(txn);
		return { id, settled: true };
	} catch {
		return { id, settled: false };
	}
}

export async function sweepOutboundFedTxns(): Promise<void> {
	const pending = await getRepositories().outboundFedTxns.listPending();
	await Promise.allSettled(pending.map(deliverOutboundFedTxn));
}

async function deliverOutboundFedTxn(txn: OutboundFedTxnRow): Promise<void> {
	const repos = getRepositories();

	// Extract recipient society handle from right side of to_principal (handle@society).
	const atIndex = txn.to_principal.lastIndexOf('@');
	if (atIndex === -1) throw new Error(`Invalid to_principal: ${txn.to_principal}`);
	const recipientHandle = txn.to_principal.slice(atIndex + 1);

	const peer = await repos.peerSocieties.findByHandle(recipientHandle);
	if (!peer?.ip_address) {
		throw new Error(`No IP on record for peer society ${recipientHandle}`);
	}

	const keypair = await repos.keypair.get();
	if (!keypair) throw new Error('No federation keypair — server may still be initializing');

	// Fresh timestamp + signature on every delivery attempt.
	// The id is the idempotency key; the receiver deduplicates on it.
	const timestamp = new Date().toISOString();
	const canonical = canonicalTransferData({
		id: txn.id,
		fromPrincipal: txn.from_principal,
		toPrincipal: txn.to_principal,
		amount: txn.amount,
		timestamp
	});
	const signature = signData(canonical, keypair.private_key);

	const result = await executeExternalFetch({
		url: `http://${peer.ip_address}/api/p2p`,
		init: {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				id: txn.id,
				fromPrincipal: txn.from_principal,
				toPrincipal: txn.to_principal,
				amount: txn.amount,
				timestamp,
				signature
			})
		},
		timeoutMs: P2P_TIMEOUT_MS,
		retries: 0
	});

	if (!result.ok) {
		const detail = result.kind === 'upstream' ? `${result.status}` : result.kind;
		throw new Error(`P2P delivery to ${recipientHandle} failed (${detail})`);
	}

	await repos.outboundFedTxns.markSettled(txn.id);
	console.log(`[p2p] settled ${txn.id}: ${txn.from_principal} → ${txn.to_principal} (${txn.amount})`);
}
