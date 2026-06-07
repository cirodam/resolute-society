import type { EntityType } from '$lib/server/types';
import type { Repositories } from '$lib/server/infra/repositories';

export type LocalEntity = { type: EntityType; id: string };

export function resolveLocalEntity(
	handle: string,
	societyId: string,
	repos: Repositories
): LocalEntity | null {
	if (handle === 'treasury') return { type: 'society', id: societyId };
	const person = repos.people.findByHandleAndSociety(handle, societyId);
	if (!person) return null;
	return { type: 'person', id: person.id };
}

export function resolveLocalEntityById(
	id: string,
	societyId: string,
	repos: Repositories
): LocalEntity | null {
	if (id === 'treasury') return { type: 'society', id: societyId };
	const person = repos.people.findProfileById(id);
	if (person && person.society_id === societyId) return { type: 'person', id: person.id };
	return null;
}
