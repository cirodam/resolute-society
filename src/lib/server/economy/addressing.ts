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

export type ParsedAddress =
	| { form: 'invalid'; reason: 'empty' | 'multiple-at' | 'empty-local' | 'empty-domain' | 'invalid-token' }
	| { form: 'handle'; kind: 'qualified'; local: string; society: string }
	| { form: 'handle'; kind: 'bare'; handle: string }
	| { form: 'ref'; kind: 'qualified'; local: string; societyId: string }
	| { form: 'ref'; kind: 'bare'; societyId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_RE = /^[a-z0-9][a-z0-9-]*$/;

function isUuid(s: string): boolean {
	return UUID_RE.test(s);
}

function isHandle(s: string): boolean {
	return HANDLE_RE.test(s);
}

export function parseAddress(input: string): ParsedAddress {
	const s = input.trim().toLowerCase();

	if (!s) return { form: 'invalid', reason: 'empty' };

	const firstAt = s.indexOf('@');
	const lastAt = s.lastIndexOf('@');

	if (firstAt !== lastAt) return { form: 'invalid', reason: 'multiple-at' };

	if (firstAt === -1) {
		if (isUuid(s)) return { form: 'ref', kind: 'bare', societyId: s };
		if (isHandle(s)) return { form: 'handle', kind: 'bare', handle: s };
		return { form: 'invalid', reason: 'invalid-token' };
	}

	const local = s.slice(0, firstAt);
	const domain = s.slice(firstAt + 1);

	if (!local) return { form: 'invalid', reason: 'empty-local' };
	if (!domain) return { form: 'invalid', reason: 'empty-domain' };

	if (isUuid(domain)) {
		if (local === 'treasury' || isUuid(local)) {
			return { form: 'ref', kind: 'qualified', local, societyId: domain };
		}
		return { form: 'invalid', reason: 'invalid-token' };
	}

	if (!isHandle(domain)) return { form: 'invalid', reason: 'invalid-token' };
	if (local !== 'treasury' && !isHandle(local)) return { form: 'invalid', reason: 'invalid-token' };

	return { form: 'handle', kind: 'qualified', local, society: domain };
}

export function parsePrincipalAddress(address: string): ParsedPrincipalAddress | null {
	const parsed = parseAddress(address);
	if (parsed.form !== 'ref' || parsed.kind !== 'qualified') return null;
	const { local, societyId } = parsed;
	if (local === 'treasury') return { kind: 'treasury', societyId };
	return { kind: 'member', personId: local, societyId };
}

export type AddressResolveResult =
	| { ok: true; principal: ResolvedPrincipal }
	| { ok: false; error: 'malformed' | 'unknown' | 'ambiguous' | 'out-of-scope' };

export async function resolveAddress(
	input: string,
	context: { societyId: string; societyHandle: string }
): Promise<AddressResolveResult> {
	const parsed = parseAddress(input);

	if (parsed.form === 'invalid') return { ok: false, error: 'malformed' };

	const repos = getRepositories();

	if (parsed.form === 'ref') {
		if (parsed.kind === 'bare') return { ok: false, error: 'ambiguous' };

		const { local, societyId } = parsed;

		if (local === 'treasury') {
			const society = await repos.societies.findById(societyId);
			if (!society) return { ok: false, error: 'unknown' };
			return { ok: true, principal: { type: 'society', id: societyId, label: `${society.name} Treasury` } };
		}

		// local is a person UUID
		const person = await repos.people.findNameById(local);
		if (!person) return { ok: false, error: 'unknown' };
		return { ok: true, principal: { type: 'person', id: local, label: `${person.given_name} ${person.surname}` } };
	}

	if (parsed.kind === 'bare') {
		const { handle } = parsed;

		const person = await repos.people.findByHandleAndSociety(handle, context.societyId);
		if (person) {
			return { ok: true, principal: { type: 'person', id: person.id, label: `${person.given_name} ${person.surname}` } };
		}

		const association = await repos.associations.findByHandleAndSociety(handle, context.societyId);
		if (association) {
			return { ok: true, principal: { type: 'association', id: association.id, label: association.name } };
		}

		if (handle === context.societyHandle) {
			const society = await repos.societies.findById(context.societyId);
			if (!society) return { ok: false, error: 'unknown' };
			return { ok: true, principal: { type: 'society', id: context.societyId, label: `${society.name} Treasury` } };
		}

		return { ok: false, error: 'unknown' };
	}

	// handle/qualified
	const { local, society: targetSocietyHandle } = parsed;

	let targetSocietyId: string;

	if (targetSocietyHandle === context.societyHandle) {
		targetSocietyId = context.societyId;
	} else {
		const peer = await repos.peerSocieties.findByHandle(targetSocietyHandle);
		if (!peer) return { ok: false, error: 'unknown' };
		return { ok: false, error: 'out-of-scope' };
	}

	if (local === 'treasury') {
		const society = await repos.societies.findById(targetSocietyId);
		if (!society) return { ok: false, error: 'unknown' };
		return { ok: true, principal: { type: 'society', id: targetSocietyId, label: `${society.name} Treasury` } };
	}

	const person = await repos.people.findByHandleAndSociety(local, targetSocietyId);
	if (person) {
		return { ok: true, principal: { type: 'person', id: person.id, label: `${person.given_name} ${person.surname}` } };
	}

	const association = await repos.associations.findByHandleAndSociety(local, targetSocietyId);
	if (association) {
		return { ok: true, principal: { type: 'association', id: association.id, label: association.name } };
	}

	return { ok: false, error: 'unknown' };
}

