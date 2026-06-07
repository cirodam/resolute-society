import { requirePermission } from '$lib/server/services/auth.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { error, fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = await repositories.societies.findById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const assemblies = await repositories.assembly.listAssemblies(resolveSocietyId(undefined));
	const assemblyMembers = new Map<string, Array<{ person_id: string; given_name: string; surname: string; handle: string; seat_number: number }>>();

	for (const assembly of assemblies) {
		assemblyMembers.set(assembly.id, await repositories.assembly.listAssemblyMembers(assembly.id));
	}

	return {
		society,
		assemblies,
		assemblyMembers: Object.fromEntries(assemblyMembers),
		eligibleMembers: await repositories.positions.listEligibleMembers(resolveSocietyId(undefined))
	};
};

export const actions: Actions = {
	assign: async (event) => {
		const { request, params } = event;
		await requirePermission(event, 'assembly.assign_seat', resolveSocietyId(undefined));

		const formData = await request.formData();
		const assemblyId = formData.get('assembly_id') as string;
		const personId = formData.get('person_id') as string;
		const seatNumber = parseInt(formData.get('seat_number') as string);

		if (!assemblyId || !personId || !seatNumber) {
			return fail(400, { message: 'Missing required fields' });
		}

		const repositories = getRepositories();
		if (await repositories.positions.isPersonOfficer(personId, resolveSocietyId(undefined))) {
			return fail(400, { message: 'Officers cannot be assembly members' });
		}

		if (await repositories.assembly.isSeatOccupied(assemblyId, seatNumber)) {
			return fail(400, { message: 'Seat is already occupied' });
		}

		await repositories.assembly.assignSeat(assemblyId, personId, seatNumber);

		return { success: true };
	},

	unassign: async (event) => {
		const { request, params } = event;
		await requirePermission(event, 'assembly.unassign_seat', resolveSocietyId(undefined));

		const formData = await request.formData();
		const assemblyId = formData.get('assembly_id') as string;
		const seatNumber = parseInt(formData.get('seat_number') as string);

		if (!assemblyId || !seatNumber) {
			return fail(400, { message: 'Missing required fields' });
		}

		const repositories = getRepositories();
		await repositories.assembly.unassignSeat(assemblyId, seatNumber);

		return { success: true };
	}
} satisfies Actions;
