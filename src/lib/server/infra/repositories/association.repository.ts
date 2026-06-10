import type postgres from 'postgres';

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
	constructor(private readonly sql: postgres.Sql) {}

	async findByHandleAndSociety(handle: string, societyId: string): Promise<AssociationHandleRow | null> {
		const [row] = await this.sql<AssociationHandleRow[]>`
			SELECT id, name FROM association WHERE handle = ${handle} AND society_id = ${societyId}`;
		return row ?? null;
	}

	async listBySociety(societyId: string): Promise<DirectoryAssociationRow[]> {
		return await this.sql<DirectoryAssociationRow[]>`
			SELECT id, handle, name, type, special_type, description FROM association WHERE society_id = ${societyId} ORDER BY name`;
	}

	async listHubsBySociety(societyId: string): Promise<AssociationDetailRow[]> {
		return await this.sql<AssociationDetailRow[]>`
			${this.sql.unsafe(DETAIL_SELECT)}
			WHERE a.society_id = ${societyId} AND a.special_type = 'hub' AND a.location_id IS NOT NULL`;
	}

	async findById(associationId: string): Promise<AssociationDetailRow | null> {
		const [row] = await this.sql<AssociationDetailRow[]>`
			${this.sql.unsafe(DETAIL_SELECT)} WHERE a.id = ${associationId}`;
		return row ?? null;
	}

	async listMembers(associationId: string): Promise<AssociationMemberRow[]> {
		return await this.sql<AssociationMemberRow[]>`
			SELECT p.id, p.given_name, p.surname, p.handle, p.membership_status
			FROM association_member am
			JOIN person p ON am.person_id = p.id
			WHERE am.association_id = ${associationId}
			ORDER BY p.surname, p.given_name`;
	}

	async addMember(associationId: string, personId: string): Promise<void> {
		await this.sql`
			INSERT INTO association_member (association_id, person_id)
			VALUES (${associationId}, ${personId})
			ON CONFLICT DO NOTHING`;
	}

	async removeMember(associationId: string, personId: string): Promise<void> {
		await this.sql`
			DELETE FROM association_member WHERE association_id = ${associationId} AND person_id = ${personId}`;
	}

	async isMember(associationId: string, personId: string): Promise<boolean> {
		const [row] = await this.sql`
			SELECT 1 FROM association_member WHERE association_id = ${associationId} AND person_id = ${personId}`;
		return !!row;
	}

	async handleExists(handle: string): Promise<boolean> {
		const [existing] = await this.sql`SELECT id FROM association WHERE handle = ${handle}`;
		return !!existing;
	}

	async createAssociation(params: CreateAssociationParams): Promise<void> {
		await this.sql`
			INSERT INTO association (id, society_id, handle, name, type, special_type, location_id)
			VALUES (${params.associationId}, ${params.societyId}, ${params.handle}, ${params.name}, ${params.type ?? null}, ${params.specialType}, ${params.locationId ?? null})`;
	}

	async updateLocation(associationId: string, locationId: string | null): Promise<void> {
		await this.sql`UPDATE association SET location_id = ${locationId} WHERE id = ${associationId}`;
	}

	async removeMembershipsForPerson(personId: string): Promise<void> {
		await this.sql`DELETE FROM association_member WHERE person_id = ${personId}`;
	}
}
