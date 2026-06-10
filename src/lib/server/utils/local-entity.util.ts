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
	if (person) return { type: 'person', id: person.id };
	const association = await repos.associations.findByHandleAndSociety(handle, societyId);
	if (association) return { type: 'association', id: association.id };
	return null;
}

export async function resolveLocalEntityById(
	id: string,
	societyId: string,
	repos: Repositories
): Promise<LocalEntity | null> {
	if (id === 'treasury') return { type: 'society', id: societyId };
	const person = await repos.people.findProfileById(id);
	if (person && person.society_id === societyId) return { type: 'person', id: person.id };
	const association = await repos.associations.findById(id);
	if (association && association.society_id === societyId) return { type: 'association', id: association.id };
	return null;
}
