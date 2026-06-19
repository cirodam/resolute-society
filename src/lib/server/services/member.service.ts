import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { db } from '$lib/server/infra/db';
import { createRepositories } from '$lib/server/infra/repositories';
import { generateFederationKeypair } from '$lib/server/federation/crypto';
import { MEMBER_ENDOWMENT } from '$lib/server/economy/endowment';
import { BCRYPT_ROUNDS } from '$lib/server/utils/form.util';

export { BCRYPT_ROUNDS };

export interface CreateMemberParams {
	societyId: string;
	societyHandle: string;
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
}

export async function createMember(params: CreateMemberParams): Promise<CreateMemberResult> {
	const {
		societyId,
		societyHandle,
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

		await repos.ledger.createTransaction({
			fromType: 'system',
			fromId: 'mint',
			toType: 'society',
			toId: societyId,
			amount: MEMBER_ENDOWMENT,
			note: `Member joined: ${givenName} ${surname}`
		});

		const mintId = randomUUID();
		await repos.fedMintEvents.create({ id: mintId, personId, amount: MEMBER_ENDOWMENT });
		await repos.inboundFedTxns.create({
			id: mintId,
			fromPrincipal: 'mint@federation',
			toPrincipal: `treasury@${societyHandle}`,
			amount: MEMBER_ENDOWMENT
		});
	});

	return { personId, publicKey: keypair.publicKey };
}
