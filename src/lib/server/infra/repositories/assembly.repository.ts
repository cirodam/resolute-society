import type postgres from 'postgres';
import { randomUUID } from 'crypto';

export interface GeneralAssemblyRow {
	id: string;
	term_number: number;
	term_start: string;
	term_end: string;
	seat_count: number;
	status: 'preceding' | 'current' | 'following';
}

export interface GeneralAssemblyMemberRow {
	person_id: string;
	given_name: string;
	surname: string;
	handle: string;
	seat_number: number;
}

export class AssemblyRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listAssemblies(societyId: string): Promise<GeneralAssemblyRow[]> {
		return await this.sql<GeneralAssemblyRow[]>`
			SELECT id, term_number, term_start, term_end, seat_count, status
			FROM general_assembly
			WHERE society_id = ${societyId}
			ORDER BY term_number`;
	}

	async listAssemblyMembers(assemblyId: string): Promise<GeneralAssemblyMemberRow[]> {
		return await this.sql<GeneralAssemblyMemberRow[]>`
			SELECT gam.seat_number, p.id as person_id, p.given_name, p.surname, p.handle
			FROM general_assembly_member gam
			JOIN person p ON p.id = gam.person_id
			WHERE gam.assembly_id = ${assemblyId}
			ORDER BY gam.seat_number`;
	}

	async isSeatOccupied(assemblyId: string, seatNumber: number): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM general_assembly_member WHERE assembly_id = ${assemblyId} AND seat_number = ${seatNumber}`;
		return !!existing;
	}

	async assignSeat(assemblyId: string, personId: string, seatNumber: number): Promise<void> {
		await this.sql`
			INSERT INTO general_assembly_member (assembly_id, person_id, seat_number)
			VALUES (${assemblyId}, ${personId}, ${seatNumber})`;
	}

	async unassignSeat(assemblyId: string, seatNumber: number): Promise<void> {
		await this.sql`
			DELETE FROM general_assembly_member WHERE assembly_id = ${assemblyId} AND seat_number = ${seatNumber}`;
	}

	async removePersonFromAllSeats(personId: string): Promise<void> {
		await this.sql`DELETE FROM general_assembly_member WHERE person_id = ${personId}`;
	}

	async initializeGeneralAssembly(societyId: string): Promise<void> {
		const now = new Date();
		const oneYearLater = new Date(now);
		oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
		const twoYearsLater = new Date(oneYearLater);
		twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 1);

		const id1 = randomUUID();
		const id2 = randomUUID();
		const nowIso = now.toISOString();
		const oneYearIso = oneYearLater.toISOString();
		const twoYearIso = twoYearsLater.toISOString();

		await this.sql`
			INSERT INTO general_assembly (id, society_id, term_number, term_start, term_end, seat_count, status)
			VALUES (${id1}, ${societyId}, ${1}, ${nowIso}, ${oneYearIso}, ${9}, ${'current'})`;

		await this.sql`
			INSERT INTO general_assembly (id, society_id, term_number, term_start, term_end, seat_count, status)
			VALUES (${id2}, ${societyId}, ${2}, ${oneYearIso}, ${twoYearIso}, ${9}, ${'following'})`;
	}

	async initializeOfficerCorps(societyId: string): Promise<void> {
		const positions = [
			{
				name: 'Treasurer',
				description: 'Manages the society finances and treasury operations',
				term_limit_years: 2,
				default_allowance: 100
			},
			{
				name: 'Registrar',
				description: 'Maintains membership records and official society documents',
				term_limit_years: 2,
				default_allowance: 100
			},
			{
				name: 'Education Director',
				description: 'Oversees educational programs and approves course offerings',
				term_limit_years: 2,
				default_allowance: 100
			}
		];

		for (const position of positions) {
			const posId = randomUUID();
			await this.sql`
				INSERT INTO position (id, society_id, parent_position_id, type, name, description, term_limit_years, default_allowance, current_allowance)
				VALUES (${posId}, ${societyId}, ${null}, ${'officer'}, ${position.name}, ${position.description}, ${position.term_limit_years}, ${position.default_allowance}, ${position.default_allowance})`;
		}
	}

	async findCurrentSeatForPerson(personId: string): Promise<{ seat_number: number; term_number: number; term_end: string } | null> {
		const [row] = await this.sql<Array<{ seat_number: number; term_number: number; term_end: string }>>`
			SELECT gam.seat_number, ga.term_number, ga.term_end
			FROM general_assembly_member gam
			JOIN general_assembly ga ON ga.id = gam.assembly_id
			WHERE gam.person_id = ${personId} AND ga.status = 'current'
			LIMIT 1`;
		return row ?? null;
	}
}
