import { createHash } from 'node:crypto';

export const GENESIS_PREV_HASH = '0'.repeat(64);

export function computeChainHash(
	prevHash: string,
	id: string,
	fromType: string,
	fromId: string,
	toType: string,
	toId: string,
	amount: number,
	note: string | null,
	createdAt: string
): string {
	const input = [prevHash, id, fromType, fromId, toType, toId, String(amount), note ?? '', createdAt].join('|');
	return createHash('sha256').update(input, 'utf8').digest('hex');
}
