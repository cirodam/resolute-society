import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from '$lib/server/infra/db';
import { getRepositories, createRepositories } from '$lib/server/infra/repositories';
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

		if (await repos.societies.handleExists(societyHandle))
			return fail(400, { error: 'That society handle is already taken' });

		// Pre-compute async values before entering the DB transaction.
		const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
		const keypair = generateFederationKeypair();

		const societyId = randomUUID();
		const personId  = randomUUID();
		const age        = calculateAgeYears(dob);
		const endowment  = calculateEndowmentTarget(dob);

		await db().begin(async (sql) => {
			const txRepos = createRepositories(sql);
			await txRepos.societies.createSociety({ societyId, handle: societyHandle, name: societyName, address: societyAddress });
			await txRepos.assembly.initializeGeneralAssembly(societyId);
			await txRepos.assembly.initializeOfficerCorps(societyId);
			await txRepos.permissions.seedDefaultPositionPermissions(societyId);

			await txRepos.people.createPerson({
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

			await txRepos.societies.setFounder(societyId, personId);
			await txRepos.nutrition.seedDefaults(societyId);

			if (endowment > 0) {
				await txRepos.ledger.createTransaction({
					fromType: 'system',
					fromId: 'mint',
					toType: 'society',
					toId: societyId,
					amount: endowment,
					note: `Bootstrap: ${givenName} ${surname} (${age} person-years)`
				});

				const mintId = randomUUID();
				await txRepos.fedMintEvents.create({ id: mintId, personId, personAge: age, amount: endowment });
				await txRepos.inboundFedTxns.create({
					id: mintId,
					fromPrincipal: 'mint@federation',
					toPrincipal: `treasury@${societyHandle}`,
					amount: endowment
				});
			}
		});

		throw redirect(303, '/login');
	}
};
