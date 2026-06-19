import { error } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findById(societyId);
	if (!society) throw error(404, 'Society not found');

	const assemblies = await repos.assembly.listAssemblies(societyId);
	const assemblyMembers = new Map<string, Array<{ person_id: string; given_name: string; surname: string; handle: string; seat_number: number }>>();

	for (const assembly of assemblies) {
		assemblyMembers.set(assembly.id, await repos.assembly.listAssemblyMembers(assembly.id));
	}

	return {
		society,
		assemblies,
		assemblyMembers: Object.fromEntries(assemblyMembers),
		printedAt: new Date().toISOString()
	};
};
