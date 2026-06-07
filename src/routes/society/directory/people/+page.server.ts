import { requirePermission } from '$lib/server/services/auth.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { error, fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { generateRandomPersonProfile } from '$lib/server/utils/random-person.util';
import { enqueueFederationMessage } from '$lib/server/federation/client';
import { createMember } from '$lib/server/services/member.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const repositories = getRepositories();
	const society = repositories.societies.findById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const personQuery = (url.searchParams.get('person_q') || '').trim().toLowerCase();
	const allMembers = repositories.people.listDirectoryMembers(resolveSocietyId(undefined));
	const members = personQuery
		? allMembers.filter((member) => {
				const fullName = `${member.given_name} ${member.surname}`.toLowerCase();
				return (
					fullName.includes(personQuery) ||
					member.handle.toLowerCase().includes(personQuery) ||
					member.membership_status.toLowerCase().includes(personQuery)
				);
		  })
		: allMembers;

	return {
		society,
		members,
		personQuery,
		memberCount: allMembers.length
	};
};

export const actions: Actions = {
	seedRandomPerson: async (event) => {
		requirePermission(event, 'membership.create_member', resolveSocietyId(undefined));

		const societyId = resolveSocietyId(undefined);
		const repositories = getRepositories();
		const { givenName, surname, handle, dob } = generateRandomPersonProfile((candidate) =>
			repositories.people.handleExists(candidate)
		);

		const { personId, publicKey, age } = await createMember({
			societyId,
			handle,
			givenName,
			surname,
			password: 'password',
			dob,
			membershipStatus: 'provisional'
		});

		const society = repositories.societies.findDetailById(societyId);
		if (society) {
			const memberCount = repositories.people.countBySociety(societyId);
			enqueueFederationMessage('society_heartbeat', society.handle, {
				societyId,
				name: society.name,
				handle: society.handle,
				address: society.address,
				lat: society.lat,
				lng: society.lng,
				memberCount
			});
			enqueueFederationMessage('person_joined', society.handle, {
				personHandle: handle,
				personId,
				age,
				publicKey
			});
		}

		return {
			seedSuccess: true,
			seededName: `${givenName} ${surname}`,
			seededHandle: handle
		};
	},

	runSortition: async (event) => {
		const { params } = event;
		requirePermission(event, 'membership.run_sortition', resolveSocietyId(undefined));

		const repositories = getRepositories();
		const members = repositories.people.listFullMembers(resolveSocietyId(undefined));
		const memberCount = members.length;

		if (memberCount === 0) {
			return { sortitionError: 'No full members to assign numbers to' };
		}

		repositories.people.clearSortitionNumbersForNonFullMembers(resolveSocietyId(undefined));

		const numbers = Array.from({ length: memberCount }, (_, index) => index + 1);

		for (let index = numbers.length - 1; index > 0; index--) {
			const swapIndex = Math.floor(Math.random() * (index + 1));
			[numbers[index], numbers[swapIndex]] = [numbers[swapIndex], numbers[index]];
		}

		for (let index = 0; index < members.length; index++) {
			repositories.people.setSortitionNumber(members[index].id, numbers[index]);
		}

		return { sortitionSuccess: true, count: memberCount };
	},

} satisfies Actions;
