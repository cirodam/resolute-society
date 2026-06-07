import { resolveSocietyMember } from '$lib/server/services/society.service';
import type { EntityType } from '$lib/server/types';

export type ResolvedPrincipal = {
	type: Exclude<EntityType, 'system'>;
	id: string;
	label: string;
};

export type ParsedPrincipalAddress =
	| { kind: 'treasury'; societyId: string }
	| { kind: 'member'; personId: string; societyId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsePrincipalAddress(address: string): ParsedPrincipalAddress | null {
	const trimmed = address.trim();
	if (!trimmed) return null;

	const atIdx = trimmed.indexOf('@');
	if (atIdx === -1) return null;
	if (trimmed.indexOf('@', atIdx + 1) !== -1) return null;

	const local = trimmed.slice(0, atIdx);
	const domain = trimmed.slice(atIdx + 1);

	if (!local || !domain) return null;
	if (!UUID_RE.test(domain)) return null;

	if (local === 'treasury') {
		return { kind: 'treasury', societyId: domain };
	}

	if (!UUID_RE.test(local)) return null;

	return { kind: 'member', personId: local, societyId: domain };
}

export async function resolveSocietyMemberByHandle(
	handle: string,
	societyId: string
): Promise<ResolvedPrincipal | null> {
	const member = await resolveSocietyMember(handle, societyId);
	if (!member) return null;

	return {
		type: member.type,
		id: member.id,
		label: member.label
	};
}
