import { error, fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/infra/db';
import { getRepositories, createRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { calculateAgeYears } from '$lib/server/economy/endowment';
import { parseSex } from '$lib/server/utils/form.util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) throw redirect(303, '/login');

	const repos = getRepositories();
	const person = await repos.people.findProfileById(locals.person.id);
	if (!person) throw error(404, 'Person not found');

	return {
		person,
		locations: await repos.locations.listBySociety(resolveSocietyId(undefined)),
		dependants: await repos.dependants.listByGuardian(locals.person.id)
	};
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
		if (!locals.person) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const bio        = data.get('bio')?.toString().trim() || null;
		const locationId = data.get('location_id')?.toString() || null;
		const sex        = parseSex(data.get('sex'));
		if (sex === 'invalid') return fail(400, { error: 'Invalid sex value' });

		await getRepositories().people.updateProfile({
			personId: locals.person.id,
			bio,
			locationId,
			sex
		});

		return { saved: true };
	},

	addDependant: async ({ request, locals }) => {
		if (!locals.person) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const dob              = data.get('dob')?.toString().trim();
		const sex              = parseSex(data.get('sex'));
		const coGuardianHandle = data.get('co_guardian')?.toString().trim() || null;

		if (!dob) return fail(400, { dependantError: 'Date of birth is required' });
		if (sex === 'invalid') return fail(400, { dependantError: 'Invalid sex value' });

		const age = calculateAgeYears(dob);
		if (age > 17) return fail(400, { dependantError: 'Dependant must be under 18' });

		const repos = getRepositories();
		const societyId = resolveSocietyId(undefined);
		const primaryGuardianId = locals.person.id;

		let coGuardianId: string | null = null;
		if (coGuardianHandle) {
			const coGuardian = await repos.people.findByHandleAndSociety(coGuardianHandle, societyId);
			if (!coGuardian) return fail(400, { dependantError: `No member found with handle @${coGuardianHandle}` });
			if (coGuardian.id === primaryGuardianId) return fail(400, { dependantError: 'Co-guardian must be a different person' });
			coGuardianId = coGuardian.id;
		}

		const dependantId = randomUUID();
		const share = coGuardianId ? 0.5 : 1.0;
		const total = age * 2000;

		await db().begin(async (sql) => {
			const txRepos = createRepositories(sql);
			await txRepos.dependants.create({ id: dependantId, societyId, dob, sex });
			await txRepos.dependants.addGuardian(dependantId, primaryGuardianId, share);
			if (coGuardianId) await txRepos.dependants.addGuardian(dependantId, coGuardianId, share);

			if (age > 0) {
				await txRepos.ledger.createTransaction({
					fromType: 'system',
					fromId: 'mint',
					toType: 'person',
					toId: primaryGuardianId,
					amount: Math.floor(total * share),
					note: 'Dependant credit allocation'
				});
				if (coGuardianId) {
					await txRepos.ledger.createTransaction({
						fromType: 'system',
						fromId: 'mint',
						toType: 'person',
						toId: coGuardianId,
						amount: Math.floor(total * share),
						note: 'Dependant credit allocation'
					});
				}
			}
		});

		return { dependantAdded: true };
	},

	removeDependant: async ({ request, locals }) => {
		if (!locals.person) return fail(401, { error: 'Not authenticated' });

		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { error: 'ID required' });

		const repos = getRepositories();
		if (!(await repos.dependants.isGuardian(id, locals.person.id)))
			return fail(403, { error: 'Not authorised' });

		await repos.dependants.delete(id);
		return { dependantRemoved: true };
	}
};
