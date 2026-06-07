import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
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
