import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from '$lib/server/infra/db';
import { getRepositories } from '$lib/server/infra/repositories';
import { generateFederationKeypair } from '$lib/server/federation/crypto';
import { calculateAgeYears, calculateEndowmentTarget } from '$lib/server/economy/endowment';
import { parseSex, BCRYPT_ROUNDS } from '$lib/server/utils/form.util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const societyName    = data.get('society_name')?.toString().trim();
		const societyHandle  = data.get('society_handle')?.toString().trim();
		const societyAddress = data.get('society_address')?.toString().trim() || null;

		const givenName = data.get('given_name')?.toString().trim();
		const surname   = data.get('surname')?.toString().trim();
		const dob       = data.get('dob')?.toString().trim() || null;
		const sex       = parseSex(data.get('sex'));
		const handle    = data.get('handle')?.toString().trim();
		const password  = data.get('password')?.toString();
		const password2 = data.get('password_confirm')?.toString();

		if (!societyName)   return fail(400, { error: 'Society name is required' });
		if (!societyHandle) return fail(400, { error: 'Society handle is required' });
		if (!/^[a-z0-9-]+$/.test(societyHandle))
			return fail(400, { error: 'Society handle may only contain lowercase letters, numbers, and hyphens' });
		if (!givenName)     return fail(400, { error: 'First name is required' });
		if (!surname)       return fail(400, { error: 'Last name is required' });
		if (!handle)        return fail(400, { error: 'Account handle is required' });
		if (!/^[a-z0-9-]+$/.test(handle))
			return fail(400, { error: 'Account handle may only contain lowercase letters, numbers, and hyphens' });
		if (sex === 'invalid')
			return fail(400, { error: 'Invalid sex value' });
		if (!password || password.length < 8)
			return fail(400, { error: 'Password must be at least 8 characters' });
		if (password !== password2)
			return fail(400, { error: 'Passwords do not match' });

		const repos = getRepositories();

		if (repos.societies.handleExists(societyHandle))
			return fail(400, { error: 'That society handle is already taken' });

		// Pre-compute async values before entering the synchronous DB transaction.
		const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
		const keypair = generateFederationKeypair();

		const societyId = randomUUID();
		const personId  = randomUUID();
		const age        = calculateAgeYears(dob);
		const endowment  = calculateEndowmentTarget(dob);

		db().transaction(() => {
			repos.societies.createSociety({ societyId, handle: societyHandle, name: societyName, address: societyAddress });
			repos.assembly.initializeGeneralAssembly(societyId);
			repos.assembly.initializeOfficerCorps(societyId);
			repos.permissions.seedDefaultPositionPermissions(societyId);

			repos.people.createPerson({
				personId,
				societyId,
				handle,
				givenName,
				surname,
				passwordHash,
				dob,
				sex,
				membershipStatus: 'full',
				publicKey: keypair.publicKey,
				privateKey: keypair.privateKey
			});

			repos.societies.setFounder(societyId, personId);
			repos.nutrition.seedDefaults(societyId);

			if (endowment > 0) {
				repos.ledger.createTransaction({
					fromType: 'system',
					fromId: 'mint',
					toType: 'society',
					toId: societyId,
					amount: endowment,
					note: `Bootstrap: ${givenName} ${surname} (${age} person-years)`
				});
			}
		})();

		throw redirect(303, '/login');
	}
};
