import type postgres from 'postgres';

export interface AllowanceGroupRow {
	id: string;
	name: string;
	member_count: number;
	total_amount: number;
}

export interface AllowanceGroupMemberRow {
	group_id: string;
	person_id: string;
	amount: number;
	given_name: string;
	surname: string;
	handle: string;
}

export interface AllowanceGroupRecord {
	id: string;
	name: string;
}

export class AllowanceGroupRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listBySociety(societyId: string): Promise<AllowanceGroupRow[]> {
		return await this.sql<AllowanceGroupRow[]>`
			SELECT ag.id, ag.name,
			       COUNT(agm.person_id)::int as member_count,
			       COALESCE(SUM(agm.amount), 0) as total_amount
			FROM allowance_group ag
			LEFT JOIN allowance_group_member agm ON ag.id = agm.group_id
			WHERE ag.society_id = ${societyId}
			GROUP BY ag.id
			ORDER BY ag.name`;
	}

	async listMembers(societyId: string): Promise<AllowanceGroupMemberRow[]> {
		return await this.sql<AllowanceGroupMemberRow[]>`
			SELECT agm.group_id, agm.person_id, agm.amount,
			       p.given_name, p.surname, p.handle
			FROM allowance_group_member agm
			JOIN person p ON agm.person_id = p.id
			JOIN allowance_group ag ON agm.group_id = ag.id
			WHERE ag.society_id = ${societyId} AND p.membership_status != 'deleted'
			ORDER BY p.surname, p.given_name`;
	}

	async listMembersByGroup(groupId: string): Promise<Array<{ id: string; given_name: string; surname: string; amount: number }>> {
		return await this.sql<Array<{ id: string; given_name: string; surname: string; amount: number }>>`
			SELECT p.id, p.given_name, p.surname, agm.amount
			FROM person p
			JOIN allowance_group_member agm ON p.id = agm.person_id
			WHERE agm.group_id = ${groupId} AND p.membership_status != 'deleted'`;
	}

	async find(societyId: string, groupId: string): Promise<AllowanceGroupRecord | null> {
		const [row] = await this.sql<AllowanceGroupRecord[]>`
			SELECT id, name FROM allowance_group WHERE id = ${groupId} AND society_id = ${societyId}`;
		return row ?? null;
	}

	async exists(societyId: string, name: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM allowance_group WHERE society_id = ${societyId} AND name = ${name}`;
		return !!existing;
	}

	async create(societyId: string, name: string, id: string): Promise<void> {
		await this.sql`
			INSERT INTO allowance_group (id, society_id, name) VALUES (${id}, ${societyId}, ${name})`;
	}

	async delete(groupId: string): Promise<void> {
		await this.sql`DELETE FROM allowance_group_member WHERE group_id = ${groupId}`;
		await this.sql`DELETE FROM allowance_group WHERE id = ${groupId}`;
	}

	async addMember(groupId: string, personId: string, amount: number): Promise<void> {
		await this.sql`
			INSERT INTO allowance_group_member (group_id, person_id, amount) VALUES (${groupId}, ${personId}, ${amount})`;
	}

	async removeMember(groupId: string, personId: string): Promise<void> {
		await this.sql`
			DELETE FROM allowance_group_member WHERE group_id = ${groupId} AND person_id = ${personId}`;
	}

	async removePersonFromAll(personId: string): Promise<void> {
		await this.sql`DELETE FROM allowance_group_member WHERE person_id = ${personId}`;
	}

	async updateMemberAmount(groupId: string, personId: string, amount: number): Promise<void> {
		await this.sql`
			UPDATE allowance_group_member SET amount = ${amount} WHERE group_id = ${groupId} AND person_id = ${personId}`;
	}

	async memberExists(groupId: string, personId: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM allowance_group_member WHERE group_id = ${groupId} AND person_id = ${personId}`;
		return !!existing;
	}
}
