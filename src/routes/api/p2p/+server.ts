import { json, error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { canonicalTransferData, verifyJoinMessage } from '$lib/server/federation/crypto';
import type { RequestHandler } from './$types';

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

interface P2PTransferBody {
	id: string;
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
	timestamp: string;
	signature: string;
}

function isP2PTransferBody(value: unknown): value is P2PTransferBody {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.id === 'string' &&
		typeof v.fromPrincipal === 'string' &&
		typeof v.toPrincipal === 'string' &&
		typeof v.amount === 'number' &&
		v.amount > 0 &&
		typeof v.timestamp === 'string' &&
		typeof v.signature === 'string'
	);
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!isP2PTransferBody(body)) {
		throw error(400, 'Missing or invalid required fields');
	}

	const { id, fromPrincipal, toPrincipal, amount, timestamp, signature } = body;

	const repos = getRepositories();

	// Idempotency: already received this transaction.
	if (await repos.inboundFedTxns.existsById(id)) {
		return json({ ok: true, status: 'already_received' });
	}

	// Replay window check.
	const ts = new Date(timestamp).getTime();
	if (isNaN(ts) || Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
		throw error(400, 'Timestamp out of replay window');
	}

	// Extract sender society handle from right side of fromPrincipal (handle@society).
	const atIndex = fromPrincipal.lastIndexOf('@');
	if (atIndex === -1) throw error(400, 'Invalid fromPrincipal format');
	const senderHandle = fromPrincipal.slice(atIndex + 1);

	// Look up sender in peer society table.
	const peer = await repos.peerSocieties.findByHandle(senderHandle);
	if (!peer) throw error(403, `Unknown peer society: ${senderHandle}`);
	if (!peer.public_key) throw error(403, `No public key on record for ${senderHandle} — sync with federation`);

	// Verify signature.
	const canonical = canonicalTransferData({ id, fromPrincipal, toPrincipal, amount, timestamp });
	let valid: boolean;
	try {
		valid = verifyJoinMessage(canonical, peer.public_key, signature);
	} catch {
		valid = false;
	}
	if (!valid) throw error(403, 'Invalid signature');

	// Validate toPrincipal is addressed to this society.
	const society = (await repos.societies.listAll())[0];
	const ourHandle = society?.handle;
	if (!ourHandle) throw error(500, 'Society not initialized');

	const toAtIndex = toPrincipal.lastIndexOf('@');
	const toSocietyHandle = toAtIndex !== -1 ? toPrincipal.slice(toAtIndex + 1) : null;
	if (toSocietyHandle !== ourHandle) {
		throw error(400, `Transfer addressed to ${toSocietyHandle ?? 'unknown'}, not ${ourHandle}`);
	}

	await repos.inboundFedTxns.create({ id, fromPrincipal, toPrincipal, amount });

	return json({ ok: true });
};
