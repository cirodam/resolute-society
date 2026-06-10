import { randomUUID } from 'node:crypto';
import { getRepositories } from '../infra/repositories';
import { canonicalJoinData, signJoinMessage, signSocietyRequest } from './crypto';
import type { FederationMessageEnvelope, FederationMessagePayloadMap, FederationMessageType } from './messages';
import {
	executeExternalFetch,
	type ExternalFetchFailure
} from '$lib/server/http/external-fetch';

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
	return ip ? `http://${ip}` : null;
}

export interface FederationTxnRow {
	id: string;
	from_principal: string;
	to_principal: string;
	amount: number;
	note: string | null;
	created_at: string;
}

export type FederationReadDegradedReason = 'not_configured' | 'timeout' | 'network' | 'upstream';

export interface FederationReadMeta {
	degraded: boolean;
	reason: FederationReadDegradedReason | null;
	status: number | null;
	attempts: number;
}

export interface FederationBalanceReadResult extends FederationReadMeta {
	balance: number;
}

export interface FederationHistoryReadResult extends FederationReadMeta {
	history: FederationTxnRow[];
}

function configuredMeta(): FederationReadMeta {
	return {
		degraded: false,
		reason: null,
		status: null,
		attempts: 1
	};
}

function notConfiguredMeta(): FederationReadMeta {
	return {
		degraded: true,
		reason: 'not_configured',
		status: null,
		attempts: 0
	};
}

export function readMetaFromFailure(failure: ExternalFetchFailure): FederationReadMeta {
	if (failure.kind === 'timeout') {
		return {
			degraded: true,
			reason: 'timeout',
			status: failure.status ?? null,
			attempts: failure.attempts
		};
	}

	if (failure.kind === 'network') {
		return {
			degraded: true,
			reason: 'network',
			status: failure.status ?? null,
			attempts: failure.attempts
		};
	}

	return {
		degraded: true,
		reason: 'upstream',
		status: failure.status ?? null,
		attempts: failure.attempts
	};
}

export function isPrincipalNotFound(status: number | undefined, body: string | null | undefined): boolean {
	return status === 404 && !!body && /principal not found/i.test(body);
}

export async function getFederationHistoryWithMeta(
	principal: string
): Promise<FederationHistoryReadResult> {
	const federationUrl = await getFederationUrl();
	if (!federationUrl) {
		return {
			history: [],
			...notConfiguredMeta()
		};
	}
	const url = `${federationUrl}/api/history?principal=${encodeURIComponent(principal)}`;
	const result = await executeExternalFetch({
		url,
		init: { headers: await societyAuthHeaders(`GET\n${url}`) },
		timeoutMs: FEDERATION_READ_TIMEOUT_MS,
		retries: 0
	});
	if (!result.ok) {
		return {
			history: [],
			...readMetaFromFailure(result)
		};
	}

	const baseMeta: FederationReadMeta = {
		...configuredMeta(),
		attempts: result.attempts
	};

	try {
		const payload = (await result.response.json()) as unknown;
		if (Array.isArray(payload)) {
			return {
				history: payload as FederationTxnRow[],
				...baseMeta
			};
		}
	} catch { /* ignore */ }

	return {
		history: [],
		degraded: true,
		reason: 'upstream',
		status: result.response.status,
		attempts: result.attempts
	};
}

export async function getFederationHistory(principal: string): Promise<FederationTxnRow[]> {
	const result = await getFederationHistoryWithMeta(principal);
	return result.history;
}

export async function getFederationBalanceWithMeta(
	principal: string
): Promise<FederationBalanceReadResult> {
	const federationUrl = await getFederationUrl();
	if (!federationUrl) {
		return {
			balance: 0,
			...notConfiguredMeta()
		};
	}
	const url = `${federationUrl}/api/balance?principal=${encodeURIComponent(principal)}`;
	const result = await executeExternalFetch({
		url,
		init: { headers: await societyAuthHeaders(`GET\n${url}`) },
		timeoutMs: FEDERATION_READ_TIMEOUT_MS,
		retries: 0
	});

	if (!result.ok) {
		if (result.kind === 'upstream' && result.status === 404) {
			const text404 = await result.response?.text();
			if (isPrincipalNotFound(result.status, text404)) {
				return {
					balance: 0,
					degraded: false,
					reason: null,
					status: result.status ?? 404,
					attempts: result.attempts
				};
			}
		}
		return {
			balance: 0,
			...readMetaFromFailure(result)
		};
	}
	const res = result.response;

	const text = await res.text();
	if (!text) {
		return {
			balance: 0,
			degraded: false,
			reason: null,
			status: res.status,
			attempts: result.attempts
		};
	}

	try {
		const payload = JSON.parse(text) as { balance?: unknown } | number;
		if (typeof payload === 'number') {
			return {
				balance: payload,
				degraded: false,
				reason: null,
				status: res.status,
				attempts: result.attempts
			};
		}
		if (payload && typeof payload.balance === 'number') {
			return {
				balance: payload.balance,
				degraded: false,
				reason: null,
				status: res.status,
				attempts: result.attempts
			};
		}
	} catch {
		// fall through to plain-text parse
	}

	const parsed = Number(text);
	if (Number.isFinite(parsed)) {
		return {
			balance: parsed,
			degraded: false,
			reason: null,
			status: res.status,
			attempts: result.attempts
		};
	}

	return {
		balance: 0,
		degraded: true,
		reason: 'upstream',
		status: res.status,
		attempts: result.attempts
	};
}

export async function getFederationBalance(principal: string): Promise<number> {
	const result = await getFederationBalanceWithMeta(principal);
	return result.balance;
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

	const canonical = canonicalJoinData({ id, type, societyHandle, timestamp, societyId, name, inviteToken, publicKey: keypair.public_key });
	const signature = signJoinMessage(canonical, keypair.private_key);

	const message = { id, type, societyHandle, timestamp, payload: { societyId, name, inviteToken, publicKey: keypair.public_key, signature, address, lat, lng } };
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

	// Backfill all existing members so the federation knows about them from day one.
	const members = await repos.people.listForFederationSync(societyId);
	const now = Date.now();
	for (const member of members) {
		const age = member.dob
			? Math.floor((now - new Date(member.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
			: 0;
		enqueueFederationMessage('person_joined', societyHandle, {
			personHandle: member.handle,
			personId: member.id,
			age,
			publicKey: member.public_key
		});
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
