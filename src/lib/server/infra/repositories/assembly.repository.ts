import type Database from 'better-sqlite3';
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
	constructor(private readonly database: Database.Database) {}

	listAssemblies(societyId: string): GeneralAssemblyRow[] {
		return this.database
			.prepare(
				`SELECT id, term_number, term_start, term_end, seat_count, status
				 FROM general_assembly
				 WHERE society_id = ?
				 ORDER BY term_number`
			)
			.all(societyId) as GeneralAssemblyRow[];
	}

	listAssemblyMembers(assemblyId: string): GeneralAssemblyMemberRow[] {
		return this.database
			.prepare(
				`SELECT gam.seat_number, p.id as person_id, p.given_name, p.surname, p.handle
				 FROM general_assembly_member gam
				 JOIN person p ON p.id = gam.person_id
				 WHERE gam.assembly_id = ?
				 ORDER BY gam.seat_number`
			)
			.all(assemblyId) as GeneralAssemblyMemberRow[];
	}

	isSeatOccupied(assemblyId: string, seatNumber: number): boolean {
		const existing = this.database
			.prepare('SELECT 1 FROM general_assembly_member WHERE assembly_id = ? AND seat_number = ?')
			.get(assemblyId, seatNumber);

		return !!existing;
	}

	assignSeat(assemblyId: string, personId: string, seatNumber: number): void {
		this.database
			.prepare(
				`INSERT INTO general_assembly_member (assembly_id, person_id, seat_number)
				 VALUES (?, ?, ?)`
			)
			.run(assemblyId, personId, seatNumber);
	}

	unassignSeat(assemblyId: string, seatNumber: number): void {
		this.database
			.prepare('DELETE FROM general_assembly_member WHERE assembly_id = ? AND seat_number = ?')
			.run(assemblyId, seatNumber);
	}

	removePersonFromAllSeats(personId: string): void {
		this.database
			.prepare('DELETE FROM general_assembly_member WHERE person_id = ?')
			.run(personId);
	}

	initializeGeneralAssembly(societyId: string): void {
		const now = new Date();
		const oneYearLater = new Date(now);
		oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
		const twoYearsLater = new Date(oneYearLater);
		twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 1);

		this.database
			.prepare(
				`INSERT INTO general_assembly (id, society_id, term_number, term_start, term_end, seat_count, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				randomUUID(),
				societyId,
				1,
				now.toISOString(),
				oneYearLater.toISOString(),
				9,
				'current'
			);

		this.database
			.prepare(
				`INSERT INTO general_assembly (id, society_id, term_number, term_start, term_end, seat_count, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				randomUUID(),
				societyId,
				2,
				oneYearLater.toISOString(),
				twoYearsLater.toISOString(),
				9,
				'following'
			);
	}

	initializeOfficerCorps(societyId: string): void {
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
			this.database
				.prepare(
					`INSERT INTO position (id, society_id, parent_position_id, type, name, description, term_limit_years, default_allowance, current_allowance)
					 VALUES (?, ?, NULL, 'officer', ?, ?, ?, ?, ?)`
				)
				.run(
					randomUUID(),
					societyId,
					position.name,
					position.description,
					position.term_limit_years,
					position.default_allowance,
					position.default_allowance
				);
		}
	}

	findCurrentSeatForPerson(personId: string): { seat_number: number; term_number: number; term_end: string } | null {
		return (
			(this.database
				.prepare(
					`SELECT gam.seat_number, ga.term_number, ga.term_end
					 FROM general_assembly_member gam
					 JOIN general_assembly ga ON ga.id = gam.assembly_id
					 WHERE gam.person_id = ? AND ga.status = 'current'
					 LIMIT 1`
				)
				.get(personId) as { seat_number: number; term_number: number; term_end: string } | undefined) ?? null
		);
	}
}
