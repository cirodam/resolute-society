import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from '$lib/server/infra/db';
import { createRepositories } from '$lib/server/infra/repositories';
import { generateFederationKeypair } from '$lib/server/federation/crypto';
import { calculateAgeYears, calculateEndowmentTarget } from '$lib/server/economy/endowment';
import { BCRYPT_ROUNDS } from '$lib/server/utils/form.util';

export { BCRYPT_ROUNDS };

export interface CreateMemberParams {
	societyId: string;
	handle: string;
	givenName: string;
	surname: string;
	password: string;
	dob: string | null;
	sex?: 'male' | 'female' | 'other' | null;
	locationId?: string | null;
	membershipStatus?: 'provisional' | 'full';
}

export interface CreateMemberResult {
	personId: string;
	publicKey: string;
	age: number;
}

export async function createMember(params: CreateMemberParams): Promise<CreateMemberResult> {
	const {
		societyId,
		handle,
		givenName,
		surname,
		password,
		dob,
		sex = null,
		locationId = null,
		membershipStatus = 'provisional'
	} = params;

	const personId = randomUUID();
	const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
	const keypair = generateFederationKeypair();
	const age = calculateAgeYears(dob);
	const endowment = calculateEndowmentTarget(dob);

	await db().begin(async (sql) => {
		const repos = createRepositories(sql);
		await repos.people.createPerson({
			personId,
			societyId,
			handle,
			givenName,
			surname,
			passwordHash,
			dob,
			sex,
			locationId,
			membershipStatus,
			publicKey: keypair.publicKey,
			privateKey: keypair.privateKey
		});

		if (endowment > 0) {
			await repos.ledger.createTransaction({
				fromType: 'system',
				fromId: 'mint',
				toType: 'society',
				toId: societyId,
				amount: endowment,
				note: `Money creation: ${givenName} ${surname} joined (${age} person-years)`
			});
		}
	});

	return { personId, publicKey: keypair.publicKey, age };
}
