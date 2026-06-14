import type postgres from 'postgres';

export interface SessionPersonRow {
	id: string;
	society_id: string;
	handle: string;
	given_name: string;
	surname: string;
	membership_status: string;
	welcome_seen_at: string | null;
}

export interface LoginPersonRow {
	id: string;
	society_id: string;
	password_hash: string;
	welcome_seen_at: string | null;
}

export interface PersonProfileRow {
	id: string;
	handle: string;
	given_name: string;
	surname: string;
	dob: string | null;
	sex: 'male' | 'female' | 'other' | null;
	location_id: string | null;
	location_name: string | null;
	bio: string | null;
	sortition_number: number | null;
	membership_status: string;
	society_name: string;
	society_id: string;
}

export interface PersonIdentityRow {
	id: string;
	given_name: string;
	surname: string;
}

export interface PersonSocietyRow {
	society_id: string;
}

export interface PersonDetailRow {
	id: string;
	handle: string;
	given_name: string;
	surname: string;
	dob: string | null;
	sex: 'male' | 'female' | 'other' | null;
	location_id: string | null;
	location_name: string | null;
	bio: string | null;
	sortition_number: number | null;
	membership_status: string;
	society_name: string;
	society_id: string;
}

export interface PersonAssociationRow {
	name: string;
	type: string | null;
	is_college: boolean;
}

export interface PersonNameRow {
	id: string;
	given_name: string;
	surname: string;
}

export interface CreatePersonParams {
	personId: string;
	societyId: string;
	handle: string;
	givenName: string;
	surname: string;
	passwordHash: string;
	dob: string | null;
	sex?: 'male' | 'female' | 'other' | null;
	locationId?: string | null;
	membershipStatus: string;
	publicKey?: string | null;
	privateKey?: string | null;
	welcomeSeenAt?: string | null;
}

export interface DirectoryMemberRow {
	id: string;
	handle: string;
	given_name: string;
	surname: string;
	membership_status: string;
	sortition_number: number | null;
}

export interface FullMemberRow {
	id: string;
}

export interface EndowmentMemberRow {
	id: string;
	dob: string | null;
}

export class PersonRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async findSessionPersonById(personId: string): Promise<SessionPersonRow | null> {
		const [row] = await this.sql<SessionPersonRow[]>`
			SELECT id, society_id, handle, given_name, surname, membership_status, welcome_seen_at
			FROM person WHERE id = ${personId} AND membership_status != 'deleted'`;
		return row ?? null;
	}

	async findLoginByHandle(handle: string): Promise<LoginPersonRow | null> {
		const [row] = await this.sql<LoginPersonRow[]>`
			SELECT id, society_id, password_hash, welcome_seen_at FROM person WHERE handle = ${handle} AND membership_status != 'deleted'`;
		return row ?? null;
	}

	async findProfileById(personId: string): Promise<PersonProfileRow | null> {
		const [row] = await this.sql<PersonProfileRow[]>`
			SELECT
				p.id, p.handle, p.given_name, p.surname, p.dob, p.sex,
				p.location_id, l.name AS location_name,
				p.bio, p.sortition_number, p.membership_status,
				(SELECT value FROM society_config WHERE key = 'society.name') AS society_name,
				p.society_id
			FROM person p
			LEFT JOIN location l ON p.location_id = l.id
			WHERE p.id = ${personId}`;
		return row ?? null;
	}

	async findSocietyByPersonId(personId: string): Promise<PersonSocietyRow | null> {
		const [row] = await this.sql<PersonSocietyRow[]>`SELECT society_id FROM person WHERE id = ${personId}`;
		return row ?? null;
	}

	async findByHandleAndSociety(handle: string, societyId: string): Promise<PersonIdentityRow | null> {
		const [row] = await this.sql<PersonIdentityRow[]>`
			SELECT id, given_name, surname FROM person WHERE handle = ${handle} AND society_id = ${societyId}`;
		return row ?? null;
	}

	async findDetailById(personId: string): Promise<PersonDetailRow | null> {
		const [row] = await this.sql<PersonDetailRow[]>`
			SELECT
				p.id, p.handle, p.given_name, p.surname, p.dob, p.sex,
				p.location_id, l.name AS location_name,
				p.bio, p.sortition_number, p.membership_status,
				(SELECT value FROM society_config WHERE key = 'society.name') AS society_name,
				p.society_id
			FROM person p
			LEFT JOIN location l ON p.location_id = l.id
			WHERE p.id = ${personId}`;
		return row ?? null;
	}

	async findNameById(personId: string): Promise<PersonNameRow | null> {
		const [row] = await this.sql<PersonNameRow[]>`SELECT id, given_name, surname FROM person WHERE id = ${personId}`;
		return row ?? null;
	}

	async handleExists(handle: string): Promise<boolean> {
		const [existing] = await this.sql`SELECT id FROM person WHERE handle = ${handle}`;
		return !!existing;
	}

	async createPerson(params: CreatePersonParams): Promise<void> {
		await this.sql`
			INSERT INTO person (id, society_id, handle, given_name, surname, password_hash, dob, sex, location_id, membership_status, public_key, private_key, welcome_seen_at)
			VALUES (${params.personId}, ${params.societyId}, ${params.handle}, ${params.givenName}, ${params.surname}, ${params.passwordHash}, ${params.dob}, ${params.sex ?? null}, ${params.locationId ?? null}, ${params.membershipStatus}, ${params.publicKey ?? null}, ${params.privateKey ?? null}, ${params.welcomeSeenAt ?? null})`;
	}

	async updateProfile(params: {
		personId: string;
		bio: string | null;
		locationId: string | null;
		sex: 'male' | 'female' | 'other' | null;
	}): Promise<void> {
		await this.sql`UPDATE person SET bio = ${params.bio}, location_id = ${params.locationId}, sex = ${params.sex} WHERE id = ${params.personId}`;
	}

	async markWelcomeSeen(personId: string): Promise<void> {
		await this.sql`UPDATE person SET welcome_seen_at = NOW() WHERE id = ${personId}`;
	}

	async listWithoutKeypair(societyId: string): Promise<Array<{ id: string }>> {
		return await this.sql<Array<{ id: string }>>`
			SELECT id FROM person WHERE society_id = ${societyId} AND public_key IS NULL`;
	}

	async setKeypair(personId: string, publicKey: string, privateKey: string): Promise<void> {
		await this.sql`UPDATE person SET public_key = ${publicKey}, private_key = ${privateKey} WHERE id = ${personId}`;
	}

	async listAssociations(personId: string): Promise<PersonAssociationRow[]> {
		const rows = await this.sql<Array<{ name: string; type: string | null; is_college: boolean }>>`
			SELECT a.name, a.type, (a.special_type = 'college') AS is_college
			FROM association_member am
			JOIN association a ON am.association_id = a.id
			WHERE am.person_id = ${personId}
			ORDER BY a.name`;

		return rows.map((row) => ({
			...row,
			is_college: row.is_college === true
		}));
	}

	async updateBio(personId: string, bio: string | null): Promise<void> {
		await this.sql`UPDATE person SET bio = ${bio} WHERE id = ${personId}`;
	}

	async updateMembershipStatus(personId: string, status: string): Promise<void> {
		await this.sql`UPDATE person SET membership_status = ${status} WHERE id = ${personId}`;
	}

	async listDirectoryMembers(societyId: string): Promise<DirectoryMemberRow[]> {
		return await this.sql<DirectoryMemberRow[]>`
			SELECT id, handle, given_name, surname, membership_status, sortition_number
			FROM person
			WHERE society_id = ${societyId} AND membership_status != 'deleted'
			ORDER BY given_name, surname`;
	}

	async listFullMembers(societyId: string): Promise<FullMemberRow[]> {
		return await this.sql<FullMemberRow[]>`
			SELECT id FROM person WHERE society_id = ${societyId} AND membership_status = 'full'`;
	}

	async clearSortitionNumbersForNonFullMembers(societyId: string): Promise<void> {
		await this.sql`
			UPDATE person SET sortition_number = NULL WHERE society_id = ${societyId} AND membership_status != 'full'`;
	}

	async setSortitionNumber(personId: string, sortitionNumber: number): Promise<void> {
		await this.sql`UPDATE person SET sortition_number = ${sortitionNumber} WHERE id = ${personId}`;
	}

	async countBySociety(societyId: string): Promise<number> {
		const [row] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
		return row.count;
	}

	async listForNutrition(societyId: string): Promise<Array<{ dob: string | null; sex: 'male' | 'female' | 'other' | null }>> {
		return await this.sql<Array<{ dob: string | null; sex: 'male' | 'female' | 'other' | null }>>`
			SELECT dob, sex FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
	}

	async listEndowmentMembers(societyId: string): Promise<EndowmentMemberRow[]> {
		return await this.sql<EndowmentMemberRow[]>`
			SELECT id, dob FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
	}

	async markDeleted(personId: string): Promise<void> {
		await this.sql`UPDATE person SET membership_status = 'deleted', sortition_number = NULL WHERE id = ${personId}`;
	}

	async listForFederationSync(societyId: string): Promise<Array<{ id: string; handle: string; dob: string | null; public_key: string | null }>> {
		return await this.sql<Array<{ id: string; handle: string; dob: string | null; public_key: string | null }>>`
			SELECT id, handle, dob, public_key FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
	}

	async listWithLocation(societyId: string): Promise<Array<{
		id: string;
		given_name: string;
		surname: string;
		handle: string;
		lat: number;
		lng: number;
		location_name: string;
	}>> {
		return await this.sql<Array<{
			id: string;
			given_name: string;
			surname: string;
			handle: string;
			lat: number;
			lng: number;
			location_name: string;
		}>>`
			SELECT p.id, p.given_name, p.surname, p.handle, l.lat, l.lng, l.name AS location_name
			FROM person p
			JOIN location l ON p.location_id = l.id
			WHERE p.society_id = ${societyId} AND p.membership_status != 'deleted'
			ORDER BY p.surname, p.given_name`;
	}
}
