import { randomUUID } from 'node:crypto';
import { getRepositories } from '../infra/repositories';
import { canonicalJoinData, signJoinMessage } from './crypto';
import type { FederationMessageEnvelope, FederationMessagePayloadMap, FederationMessageType } from './messages';

const FEDERATION_URL = process.env.FEDERATION_URL ?? 'http://localhost:5173';

export interface FederationTxnRow {
	id: string;
	from_principal: string;
	to_principal: string;
	amount: number;
	note: string | null;
	created_at: string;
}

export async function getFederationHistory(principal: string): Promise<FederationTxnRow[]> {
	let res: Response;
	try {
		res = await fetch(`${FEDERATION_URL}/api/history?principal=${encodeURIComponent(principal)}`);
	} catch {
		return [];
	}
	if (!res.ok) return [];
	try {
		const payload = await res.json() as unknown;
		if (Array.isArray(payload)) return payload as FederationTxnRow[];
	} catch { /* ignore */ }
	return [];
}

export async function getFederationBalance(principal: string): Promise<number> {
	let res: Response;
	try {
		res = await fetch(`${FEDERATION_URL}/api/balance?principal=${encodeURIComponent(principal)}`);
	} catch {
		return 0;
	}

	if (!res.ok) {
		const text = await res.text();
		if (res.status === 404 && /principal not found/i.test(text)) {
			return 0;
		}
		return 0;
	}

	const text = await res.text();
	if (!text) return 0;

	try {
		const payload = JSON.parse(text) as { balance?: unknown } | number;
		if (typeof payload === 'number') return payload;
		if (payload && typeof payload.balance === 'number') return payload.balance;
	} catch {
		// fall through to plain-text parse
	}

	const parsed = Number(text);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function joinFederation(inviteToken: string): void {
	const repos = getRepositories();
	const keypair = repos.keypair.get();
	if (!keypair) throw new Error('No federation keypair — server may still be initializing');

	const societies = repos.societies.listAll();
	if (!societies.length) throw new Error('No society found');
	const society = societies[0];
	const { id: societyId, handle: societyHandle, name, address, lat, lng } = society;

	const id = randomUUID();
	const type = 'society_join' as const;
	const timestamp = new Date().toISOString();

	const canonical = canonicalJoinData({ id, type, societyHandle, timestamp, societyId, name, inviteToken, publicKey: keypair.public_key });
	const signature = signJoinMessage(canonical, keypair.private_key);

	enqueueFederationMessage(type, societyHandle, { societyId, name, inviteToken, publicKey: keypair.public_key, signature, address, lat, lng }, { id, timestamp });

	// Backfill all existing members so the federation knows about them from day one.
	const members = repos.people.listForFederationSync(societyId);
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
	getRepositories().federationMessageQueue.enqueue(message);
	// Attempt immediate delivery — failures are retried by sweepFederationMessages.
	attemptDelivery(message).catch(() => {});
}

export async function sweepFederationMessages(): Promise<void> {
	const pending = getRepositories().federationMessageQueue.getPending();
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
	queue.recordAttempt(message.id);

	console.log(`[federation] dispatching ${message.type} (${message.id}) to ${FEDERATION_URL}/api/messages`);

	const res = await fetch(`${FEDERATION_URL}/api/messages`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(message)
	});

	if (!res.ok) {
		const text = await res.text();
		console.warn(`[federation] dispatch failed (${res.status}): ${text}`);
		throw new Error(`Federation message delivery failed (${res.status}): ${text}`);
	}

	queue.markDelivered(message.id);
	console.log(`[federation] delivered ${message.type} (${message.id})`);
}
