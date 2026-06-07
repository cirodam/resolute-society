import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	listBySociety(societyId: string): AllowanceGroupRow[] {
		return this.database
			.prepare(
				`SELECT ag.id, ag.name,
				        COUNT(agm.person_id) as member_count,
				        COALESCE(SUM(agm.amount), 0) as total_amount
				 FROM allowance_group ag
				 LEFT JOIN allowance_group_member agm ON ag.id = agm.group_id
				 WHERE ag.society_id = ?
				 GROUP BY ag.id
				 ORDER BY ag.name`
			)
			.all(societyId) as AllowanceGroupRow[];
	}

	listMembers(societyId: string): AllowanceGroupMemberRow[] {
		return this.database
			.prepare(
				`SELECT agm.group_id, agm.person_id, agm.amount,
				        p.given_name, p.surname, p.handle
				 FROM allowance_group_member agm
				 JOIN person p ON agm.person_id = p.id
				 JOIN allowance_group ag ON agm.group_id = ag.id
				 WHERE ag.society_id = ? AND p.membership_status != 'deleted'
				 ORDER BY p.surname, p.given_name`
			)
			.all(societyId) as AllowanceGroupMemberRow[];
	}

	listMembersByGroup(groupId: string): Array<{ id: string; given_name: string; surname: string; amount: number }> {
		return this.database
			.prepare(
				`SELECT p.id, p.given_name, p.surname, agm.amount
				 FROM person p
				 JOIN allowance_group_member agm ON p.id = agm.person_id
				 WHERE agm.group_id = ? AND p.membership_status != 'deleted'`
			)
			.all(groupId) as Array<{ id: string; given_name: string; surname: string; amount: number }>;
	}

	find(societyId: string, groupId: string): AllowanceGroupRecord | null {
		return (
			(this.database
				.prepare('SELECT id, name FROM allowance_group WHERE id = ? AND society_id = ?')
				.get(groupId, societyId) as AllowanceGroupRecord | undefined) ?? null
		);
	}

	exists(societyId: string, name: string): boolean {
		return !!this.database
			.prepare('SELECT id FROM allowance_group WHERE society_id = ? AND name = ?')
			.get(societyId, name);
	}

	create(societyId: string, name: string, id: string): void {
		this.database
			.prepare('INSERT INTO allowance_group (id, society_id, name) VALUES (?, ?, ?)')
			.run(id, societyId, name);
	}

	delete(groupId: string): void {
		this.database.prepare('DELETE FROM allowance_group_member WHERE group_id = ?').run(groupId);
		this.database.prepare('DELETE FROM allowance_group WHERE id = ?').run(groupId);
	}

	addMember(groupId: string, personId: string, amount: number): void {
		this.database
			.prepare('INSERT INTO allowance_group_member (group_id, person_id, amount) VALUES (?, ?, ?)')
			.run(groupId, personId, amount);
	}

	removeMember(groupId: string, personId: string): void {
		this.database
			.prepare('DELETE FROM allowance_group_member WHERE group_id = ? AND person_id = ?')
			.run(groupId, personId);
	}

	removePersonFromAll(personId: string): void {
		this.database
			.prepare('DELETE FROM allowance_group_member WHERE person_id = ?')
			.run(personId);
	}

	updateMemberAmount(groupId: string, personId: string, amount: number): void {
		this.database
			.prepare('UPDATE allowance_group_member SET amount = ? WHERE group_id = ? AND person_id = ?')
			.run(amount, groupId, personId);
	}

	memberExists(groupId: string, personId: string): boolean {
		return !!this.database
			.prepare('SELECT 1 FROM allowance_group_member WHERE group_id = ? AND person_id = ?')
			.get(groupId, personId);
	}
}
