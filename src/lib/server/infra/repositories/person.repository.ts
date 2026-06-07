import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	findSessionPersonById(personId: string): SessionPersonRow | null {
		const person = this.database
			.prepare(
				"SELECT id, society_id, handle, given_name, surname, membership_status, welcome_seen_at FROM person WHERE id = ? AND membership_status != 'deleted'"
			)
			.get(personId) as SessionPersonRow | undefined;

		return person ?? null;
	}

	findLoginByHandle(handle: string): LoginPersonRow | null {
		const person = this.database
			.prepare("SELECT id, society_id, password_hash, welcome_seen_at FROM person WHERE handle = ? AND membership_status != 'deleted'")
			.get(handle) as LoginPersonRow | undefined;

		return person ?? null;
	}

	findProfileById(personId: string): PersonProfileRow | null {
		const person = this.database
			.prepare(
				`SELECT
						p.id, p.handle, p.given_name, p.surname, p.dob, p.sex,
					p.location_id, l.name AS location_name,
					p.bio, p.sortition_number, p.membership_status,
					s.name AS society_name, s.id AS society_id
				 FROM person p
				 JOIN society_config s ON p.society_id = s.id
				 LEFT JOIN location l ON p.location_id = l.id
				 WHERE p.id = ?`
			)
			.get(personId) as PersonProfileRow | undefined;

		return person ?? null;
	}

	findSocietyByPersonId(personId: string): PersonSocietyRow | null {
		const person = this.database
			.prepare('SELECT society_id FROM person WHERE id = ?')
			.get(personId) as PersonSocietyRow | undefined;

		return person ?? null;
	}

	findByHandleAndSociety(handle: string, societyId: string): PersonIdentityRow | null {
		const person = this.database
			.prepare('SELECT id, given_name, surname FROM person WHERE handle = ? AND society_id = ?')
			.get(handle, societyId) as PersonIdentityRow | undefined;

		return person ?? null;
	}

	findDetailById(personId: string): PersonDetailRow | null {
		const person = this.database
			.prepare(
				`SELECT
						p.id, p.handle, p.given_name, p.surname, p.dob, p.sex,
					p.location_id, l.name AS location_name,
					p.bio, p.sortition_number, p.membership_status,
					s.name AS society_name, s.id AS society_id
				 FROM person p
				 JOIN society_config s ON p.society_id = s.id
				 LEFT JOIN location l ON p.location_id = l.id
				 WHERE p.id = ?`
			)
			.get(personId) as PersonDetailRow | undefined;

		return person ?? null;
	}

	findNameById(personId: string): PersonNameRow | null {
		const person = this.database
			.prepare('SELECT id, given_name, surname FROM person WHERE id = ?')
			.get(personId) as PersonNameRow | undefined;

		return person ?? null;
	}

	handleExists(handle: string): boolean {
		const existing = this.database.prepare('SELECT id FROM person WHERE handle = ?').get(handle);

		return !!existing;
	}

	createPerson(params: CreatePersonParams): void {
		this.database
			.prepare(
				`INSERT INTO person (id, society_id, handle, given_name, surname, password_hash, dob, sex, location_id, membership_status, public_key, private_key, welcome_seen_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.personId,
				params.societyId,
				params.handle,
				params.givenName,
				params.surname,
				params.passwordHash,
				params.dob,
				params.sex ?? null,
				params.locationId ?? null,
				params.membershipStatus,
				params.publicKey ?? null,
				params.privateKey ?? null,
				params.welcomeSeenAt ?? null
			);
	}

	updateProfile(params: {
		personId: string;
		bio: string | null;
		locationId: string | null;
		sex: 'male' | 'female' | 'other' | null;
	}): void {
		this.database
			.prepare(`UPDATE person SET bio = ?, location_id = ?, sex = ? WHERE id = ?`)
			.run(params.bio, params.locationId, params.sex, params.personId);
	}

	markWelcomeSeen(personId: string): void {
		this.database
			.prepare('UPDATE person SET welcome_seen_at = datetime(\'now\') WHERE id = ?')
			.run(personId);
	}

	findPublicKeyByHandle(handle: string, societyId: string): string | null {
		const row = this.database
			.prepare('SELECT public_key FROM person WHERE handle = ? AND society_id = ?')
			.get(handle, societyId) as { public_key: string | null } | undefined;
		return row?.public_key ?? null;
	}

	findPrivateKeyByHandle(handle: string, societyId: string): string | null {
		const row = this.database
			.prepare('SELECT private_key FROM person WHERE handle = ? AND society_id = ?')
			.get(handle, societyId) as { private_key: string | null } | undefined;
		return row?.private_key ?? null;
	}

	findPrivateKeyById(personId: string): string | null {
		const row = this.database
			.prepare('SELECT private_key FROM person WHERE id = ?')
			.get(personId) as { private_key: string | null } | undefined;
		return row?.private_key ?? null;
	}

	findPublicKeyById(personId: string): string | null {
		const row = this.database
			.prepare('SELECT public_key FROM person WHERE id = ?')
			.get(personId) as { public_key: string | null } | undefined;
		return row?.public_key ?? null;
	}

	listWithoutKeypair(societyId: string): Array<{ id: string }> {
		return this.database
			.prepare('SELECT id FROM person WHERE society_id = ? AND public_key IS NULL')
			.all(societyId) as Array<{ id: string }>;
	}

	setKeypair(personId: string, publicKey: string, privateKey: string): void {
		this.database
			.prepare('UPDATE person SET public_key = ?, private_key = ? WHERE id = ?')
			.run(publicKey, privateKey, personId);
	}

	listAssociations(personId: string): PersonAssociationRow[] {
		const rows = this.database
			.prepare(
				`SELECT a.name, a.type, (a.special_type = 'college') AS is_college
				 FROM association_member am
				 JOIN association a ON am.association_id = a.id
				 WHERE am.person_id = ?
				 ORDER BY a.name`
			)
			.all(personId) as Array<
				Omit<PersonAssociationRow, 'is_college'> & {
					is_college: number;
				}
			>;

		return rows.map((row) => ({
			...row,
			is_college: row.is_college === 1
		}));
	}

	updateBio(personId: string, bio: string | null): void {
		this.database.prepare('UPDATE person SET bio = ? WHERE id = ?').run(bio, personId);
	}

	updateMembershipStatus(personId: string, status: string): void {
		this.database
			.prepare('UPDATE person SET membership_status = ? WHERE id = ?')
			.run(status, personId);
	}

	listNamesBySociety(societyId: string): PersonNameRow[] {
		return this.database
			.prepare(
				"SELECT id, given_name, surname FROM person WHERE society_id = ? AND membership_status != 'deleted' ORDER BY surname, given_name"
			)
			.all(societyId) as PersonNameRow[];
	}

	listDirectoryMembers(societyId: string): DirectoryMemberRow[] {
		return this.database
			.prepare(
				`SELECT id, handle, given_name, surname, membership_status, sortition_number
				 FROM person
				 WHERE society_id = ? AND membership_status != 'deleted'
				 ORDER BY surname, given_name`
			)
			.all(societyId) as DirectoryMemberRow[];
	}

	listFullMembers(societyId: string): FullMemberRow[] {
		return this.database
			.prepare("SELECT id FROM person WHERE society_id = ? AND membership_status = 'full'")
			.all(societyId) as FullMemberRow[];
	}

	clearSortitionNumbersForNonFullMembers(societyId: string): void {
		this.database
			.prepare('UPDATE person SET sortition_number = NULL WHERE society_id = ? AND membership_status != ?')
			.run(societyId, 'full');
	}

	setSortitionNumber(personId: string, sortitionNumber: number): void {
		this.database
			.prepare('UPDATE person SET sortition_number = ? WHERE id = ?')
			.run(sortitionNumber, personId);
	}

	countBySociety(societyId: string): number {
		const row = this.database
			.prepare("SELECT COUNT(*) as count FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.get(societyId) as { count: number };
		return row.count;
	}

	listForNutrition(societyId: string): Array<{ dob: string | null; sex: 'male' | 'female' | 'other' | null }> {
		return this.database
			.prepare("SELECT dob, sex FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.all(societyId) as Array<{ dob: string | null; sex: 'male' | 'female' | 'other' | null }>;
	}

	listEndowmentMembers(societyId: string): EndowmentMemberRow[] {
		return this.database
			.prepare("SELECT id, dob FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.all(societyId) as EndowmentMemberRow[];
	}

	markDeleted(personId: string): void {
		this.database
			.prepare("UPDATE person SET membership_status = 'deleted', sortition_number = NULL WHERE id = ?")
			.run(personId);
	}

	listForFederationSync(societyId: string): Array<{ id: string; handle: string; dob: string | null; public_key: string | null }> {
		return this.database
			.prepare("SELECT id, handle, dob, public_key FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.all(societyId) as Array<{ id: string; handle: string; dob: string | null; public_key: string | null }>;
	}

	listWithLocation(societyId: string): Array<{
		id: string;
		given_name: string;
		surname: string;
		handle: string;
		lat: number;
		lng: number;
		location_name: string;
	}> {
		return this.database
			.prepare(
				`SELECT p.id, p.given_name, p.surname, p.handle, l.lat, l.lng, l.name AS location_name
				 FROM person p
				 JOIN location l ON p.location_id = l.id
				 WHERE p.society_id = ? AND p.membership_status != 'deleted'
				 ORDER BY p.surname, p.given_name`
			)
			.all(societyId) as Array<{
				id: string;
				given_name: string;
				surname: string;
				handle: string;
				lat: number;
				lng: number;
				location_name: string;
			}>;
	}
}
