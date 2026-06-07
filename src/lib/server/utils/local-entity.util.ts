import type { EntityType } from '$lib/server/types';
import type { Repositories } from '$lib/server/infra/repositories';

export type LocalEntity = { type: EntityType; id: string };

export async function resolveLocalEntity(
	handle: string,
	societyId: string,
	repos: Repositories
): Promise<LocalEntity | null> {
	if (handle === 'treasury') return { type: 'society', id: societyId };
	const person = await repos.people.findByHandleAndSociety(handle, societyId);
	if (!person) return null;
	return { type: 'person', id: person.id };
}

export async function resolveLocalEntityById(
	id: string,
	societyId: string,
	repos: Repositories
): Promise<LocalEntity | null> {
	if (id === 'treasury') return { type: 'society', id: societyId };
	const person = await repos.people.findProfileById(id);
	if (person && person.society_id === societyId) return { type: 'person', id: person.id };
	return null;
}
