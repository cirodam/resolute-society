import { getRepositories } from '$lib/server/infra/repositories';
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
	const repos = getRepositories();
	const person = await repos.people.findByHandleAndSociety(handle, societyId);
	if (person) return { type: 'person', id: person.id, label: `${person.given_name} ${person.surname}` };
	const association = await repos.associations.findByHandleAndSociety(handle, societyId);
	if (!association) return null;
	return { type: 'association', id: association.id, label: association.name };
}
