import { randomUUID } from 'node:crypto';
import { getRepositories } from '../infra/repositories';
import { canonicalJoinData, signJoinMessage, signSocietyRequest } from './crypto';
import type { FederationMessageEnvelope, FederationMessagePayloadMap, FederationMessageType } from './messages';
import { executeExternalFetch } from '$lib/server/http/external-fetch';

const FEDERATION_READ_TIMEOUT_MS = 1500;
const FEDERATION_WRITE_TIMEOUT_MS = 5000;
const FEDERATION_DELIVERY_TIMEOUT_MS = 3000;

async function societyAuthHeaders(canonical: string): Promise<Record<string, string>> {
	const repos = getRepositories();
	const [keypair, society] = await Promise.all([
		repos.keypair.get(),
		repos.societies.listAll().then((s) => s[0])
	]);
	if (!keypair || !society) return {};
	const { timestamp, signature } = signSocietyRequest(canonical, keypair.private_key);
	return {
		'X-Society-Handle':    society.handle,
		'X-Society-Timestamp': timestamp,
		'X-Society-Signature': signature
	};
}

async function getFederationUrl(): Promise<string | null> {
	const societies = await getRepositories().societies.listAll();
	const ip = societies[0]?.federation_ip_address;
	if (!ip) return null;
	return /^https?:\/\//i.test(ip) ? ip.replace(/\/$/, '') : `http://${ip}`;
}

export interface PeerSocietyData {
	id: string;
	handle: string;
	name: string;
	address: string | null;
	lat: number | null;
	lng: number | null;
	ip_address: string | null;
	public_key: string | null;
	standing: 'forming' | 'good_standing' | 'suspended' | 'defunct';
	member_count: number;
}


export async function joinFederation(inviteToken: string): Promise<void> {
	const repos = getRepositories();
	const keypair = await repos.keypair.get();
	if (!keypair) throw new Error('No federation keypair — server may still be initializing');

	const federationUrl = await getFederationUrl();
	if (!federationUrl) throw new Error('Federation IP not configured');

	const societies = await repos.societies.listAll();
	if (!societies.length) throw new Error('No society found');
	const society = societies[0];
	const { id: societyId, handle: societyHandle, name, address, lat, lng } = society;

	const id = randomUUID();
	const type = 'society_join' as const;
	const timestamp = new Date().toISOString();
	const networkAddress = process.env.SOCIETY_PUBLIC_URL ?? 'localhost';

	const canonical = canonicalJoinData({ id, type, societyHandle, timestamp, societyId, name, inviteToken, publicKey: keypair.public_key, networkAddress });
	const signature = signJoinMessage(canonical, keypair.private_key);

	const message = { id, type, societyHandle, timestamp, payload: { societyId, name, inviteToken, publicKey: keypair.public_key, networkAddress, signature, address, lat, lng } };
	const result = await executeExternalFetch({
		url: `${federationUrl}/api/messages`,
		init: {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(message)
		},
		timeoutMs: FEDERATION_WRITE_TIMEOUT_MS,
		retries: 1,
		retryOn: ['timeout', 'network', 'upstream'],
		retryableUpstreamStatuses: [500, 502, 503, 504]
	});

	if (!result.ok) {
		if (result.kind === 'upstream') {
			const text = await result.response?.text();
			throw new Error(`Federation join failed (${result.status}): ${text ?? ''}`);
		}
		throw new Error(`Federation join failed (${result.kind})`);
	}

	const res = result.response;

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Federation join failed (${res.status}): ${text}`);
	}

	const body = await res.json() as { ok: boolean; federationPublicKey?: string | null };
	if (body.federationPublicKey) {
		await repos.societies.storeFederationPublicKey(societyId, body.federationPublicKey);
		console.log('[federation] stored federation public key');
	}

}

export function enqueueFederationMessage<T extends FederationMessageType>(
	type: T,
	societyHandle: string,
	payload: FederationMessagePayloadMap[T],
	overrides?: { id?: string; timestamp?: string }
): void {
	const message: FederationMessageEnvelope<T> = {
		id: overrides?.id ?? randomUUID(),
		type,
		societyHandle,
		payload,
		timestamp: overrides?.timestamp ?? new Date().toISOString()
	};
	// Enqueue first, then attempt delivery. Failures are retried by sweepFederationMessages.
	getRepositories().federationMessageQueue.enqueue(message)
		.then(() => attemptDelivery(message).catch(() => {}))
		.catch((err) => console.warn('[federation] enqueue failed:', (err as Error).message));
}

export async function syncPeerSocieties(): Promise<{ count: number }> {
	const federationUrl = await getFederationUrl();
	if (!federationUrl) return { count: 0 };

	const url = `${federationUrl}/api/societies`;
	const result = await executeExternalFetch({
		url,
		init: { headers: await societyAuthHeaders(`GET\n${url}`) },
		timeoutMs: FEDERATION_READ_TIMEOUT_MS,
		retries: 1,
		retryOn: ['timeout', 'network'],
		retryableUpstreamStatuses: [500, 502, 503, 504]
	});

	if (!result.ok) {
		if (result.kind === 'upstream') {
			const text = await result.response?.text();
			throw new Error(`Peer society sync failed (${result.status}): ${text ?? ''}`);
		}
		throw new Error(`Peer society sync failed (${result.kind})`);
	}

	const data = (await result.response.json()) as PeerSocietyData[];

	const repos = getRepositories();
	const localSociety = (await repos.societies.listAll())[0];
	const peers = localSociety ? data.filter((s) => s.id !== localSociety.id) : data;

	await repos.peerSocieties.upsertMany(peers);
	return { count: peers.length };
}

export async function sweepFederationMessages(): Promise<void> {
	const pending = await getRepositories().federationMessageQueue.getPending();
	await Promise.allSettled(
		pending.map((row) =>
			attemptDelivery({
				id: row.id,
				type: row.type as FederationMessageType,
				societyHandle: row.society_handle,
				payload: JSON.parse(row.payload),
				timestamp: row.created_at
			})
		)
	);
}

async function attemptDelivery(message: FederationMessageEnvelope): Promise<void> {
	const queue = getRepositories().federationMessageQueue;
	try {
		const federationUrl = await getFederationUrl();
		if (!federationUrl) throw new Error('Federation IP not configured');

		const bodyStr = JSON.stringify(message);
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };

		// society_join is open — society isn't registered yet so there's no key to verify against
		if (message.type !== 'society_join') {
			Object.assign(headers, await societyAuthHeaders(bodyStr));
		}

		console.log(`[federation] dispatching ${message.type} (${message.id}) to ${federationUrl}/api/messages`);

		const result = await executeExternalFetch({
			url: `${federationUrl}/api/messages`,
			init: {
				method: 'POST',
				headers,
				body: bodyStr
			},
			timeoutMs: FEDERATION_DELIVERY_TIMEOUT_MS,
			retries: 0
		});

		if (!result.ok) {
			if (result.kind === 'upstream') {
				const text = await result.response?.text();
				throw new Error(`Federation message delivery failed (${result.status}): ${text}`);
			}
			throw new Error(`Federation message delivery failed (${result.kind})`);
		}

		await queue.markDelivered(message.id);
		console.log(`[federation] delivered ${message.type} (${message.id})`);
	} catch (error) {
		const messageText = error instanceof Error ? error.message : 'Unknown federation delivery failure';
		const attempt = await queue.recordAttemptFailure(message.id, messageText);
		console.warn(
			`[federation] dispatch failed (${message.type}/${message.id}) attempt=${attempt.attemptCount} next=${attempt.nextAttemptAt}: ${attempt.lastErrorMessage}`
		);
		throw error;
	}
}
