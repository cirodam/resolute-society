import { getRepositories } from '$lib/server/infra/repositories';

export type MemberStub = {
	type: 'person' | 'association';
	id: string;
	label: string;
	societyId: string;
};

export async function resolveSocietyMember(handle: string, societyId: string): Promise<MemberStub | null> {
	const repos = getRepositories();

	const person = await repos.people.findByHandleAndSociety(handle, societyId);
	if (person) {
		return {
			type: 'person',
			id: person.id,
			label: `${person.given_name} ${person.surname}`,
			societyId
		};
	}

	const association = await repos.associations.findByHandleAndSociety(handle, societyId);
	if (!association) return null;

	return {
		type: 'association',
		id: association.id,
		label: association.name,
		societyId
	};
}

export async function isSocietyMember(personId: string, societyId: string): Promise<boolean> {
	const person = await getRepositories().people.findDetailById(personId);
	return !!person && person.society_id === societyId;
}
