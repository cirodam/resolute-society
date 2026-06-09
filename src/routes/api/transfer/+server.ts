import { json, error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { verifyFederationRequest } from '$lib/server/federation/crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const timestamp = request.headers.get('X-Federation-Timestamp');
	const signature = request.headers.get('X-Federation-Signature');

	const rawBody = await request.text();

	if (timestamp && signature) {
		const society = await getRepositories().societies.findDetailById(resolveSocietyId(undefined));
		const federationPublicKey = society?.federation_public_key ?? null;

		if (!federationPublicKey) {
			throw error(401, 'Federation public key not on record — rejoin the federation');
		}

		if (!verifyFederationRequest(rawBody, timestamp, signature, federationPublicKey)) {
			throw error(401, 'Invalid federation signature');
		}
	} else {
		throw error(401, 'Missing federation signature headers');
	}

	let body: unknown;
	try {
		body = JSON.parse(rawBody);
	} catch {
		throw error(400, 'Invalid JSON');
	}

	if (!isTransferNotification(body)) {
		throw error(400, 'Missing required fields');
	}

	console.log(`[transfer] ${body.fromPrincipal} → ${body.toPrincipal}: ${body.amount} fed credits`);

	return json({ ok: true });
};

interface TransferNotification {
	fromPrincipal: string;
	toPrincipal: string;
	amount: number;
}

function isTransferNotification(value: unknown): value is TransferNotification {
	if (typeof value !== 'object' || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.fromPrincipal === 'string' &&
		typeof v.toPrincipal === 'string' &&
		typeof v.amount === 'number'
	);
}
