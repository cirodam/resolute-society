import type Database from 'better-sqlite3';

export interface AssociationHandleRow {
	id: string;
	name: string;
}

export interface DirectoryAssociationRow {
	id: string;
	handle: string;
	name: string;
	type: string | null;
	special_type: string;
	description: string | null;
}

export interface AssociationDetailRow {
	id: string;
	handle: string;
	name: string;
	type: string | null;
	special_type: string;
	description: string | null;
	location_id: string | null;
	location_name: string | null;
	location_lat: number | null;
	location_lng: number | null;
	location_address: string | null;
	society_name: string;
	society_id: string;
}

export interface AssociationMemberRow {
	id: string;
	given_name: string;
	surname: string;
	handle: string;
	membership_status: string;
}

export interface CreateAssociationParams {
	associationId: string;
	societyId: string;
	handle: string;
	name: string;
	type: string | null;
	specialType: string;
	locationId?: string | null;
}

const DETAIL_SELECT = `
	SELECT
		a.id, a.handle, a.name, a.type, a.special_type, a.description,
		a.location_id,
		l.name    AS location_name,
		l.lat     AS location_lat,
		l.lng     AS location_lng,
		l.address AS location_address,
		s.name AS society_name, s.id AS society_id
	FROM association a
	JOIN society_config s ON a.society_id = s.id
	LEFT JOIN location l ON a.location_id = l.id
`;

export class AssociationRepository {
	constructor(private readonly database: Database.Database) {}

	findByHandleAndSociety(handle: string, societyId: string): AssociationHandleRow | null {
		return (
			(this.database
				.prepare('SELECT id, name FROM association WHERE handle = ? AND society_id = ?')
				.get(handle, societyId) as AssociationHandleRow | undefined) ?? null
		);
	}

	listBySociety(societyId: string): DirectoryAssociationRow[] {
		return this.database
			.prepare(
				'SELECT id, handle, name, type, special_type, description FROM association WHERE society_id = ? ORDER BY name'
			)
			.all(societyId) as DirectoryAssociationRow[];
	}

	listHubsBySociety(societyId: string): AssociationDetailRow[] {
		return this.database
			.prepare(
				`${DETAIL_SELECT}
				 WHERE a.society_id = ? AND a.special_type = 'hub' AND a.location_id IS NOT NULL`
			)
			.all(societyId) as AssociationDetailRow[];
	}

	findById(associationId: string): AssociationDetailRow | null {
		return (
			(this.database
				.prepare(`${DETAIL_SELECT} WHERE a.id = ?`)
				.get(associationId) as AssociationDetailRow | undefined) ?? null
		);
	}

	listMembers(associationId: string): AssociationMemberRow[] {
		return this.database
			.prepare(
				`SELECT p.id, p.given_name, p.surname, p.handle, p.membership_status
				 FROM association_member am
				 JOIN person p ON am.person_id = p.id
				 WHERE am.association_id = ?
				 ORDER BY p.surname, p.given_name`
			)
			.all(associationId) as AssociationMemberRow[];
	}

	handleExists(handle: string): boolean {
		return !!this.database.prepare('SELECT id FROM association WHERE handle = ?').get(handle);
	}

	createAssociation(params: CreateAssociationParams): void {
		this.database
			.prepare(
				`INSERT INTO association (id, society_id, handle, name, type, special_type, location_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.associationId,
				params.societyId,
				params.handle,
				params.name,
				params.type,
				params.specialType,
				params.locationId ?? null
			);
	}

	updateLocation(associationId: string, locationId: string | null): void {
		this.database
			.prepare('UPDATE association SET location_id = ? WHERE id = ?')
			.run(locationId, associationId);
	}

	removeMembershipsForPerson(personId: string): void {
		this.database
			.prepare('DELETE FROM association_member WHERE person_id = ?')
			.run(personId);
	}
}
