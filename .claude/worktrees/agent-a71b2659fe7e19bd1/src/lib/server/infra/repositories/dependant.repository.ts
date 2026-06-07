import type Database from 'better-sqlite3';

export interface DependantRow {
	id: string;
	dob: string;
	sex: 'male' | 'female' | 'other' | null;
	created_at: string;
}

export interface DependantGuardianRow {
	guardian_id: string;
	share: number;
}

export class DependantRepository {
	constructor(private readonly database: Database.Database) {}

	create(params: { id: string; societyId: string; dob: string; sex: 'male' | 'female' | 'other' | null }): void {
		this.database
			.prepare(`INSERT INTO dependant (id, society_id, dob, sex) VALUES (?, ?, ?, ?)`)
			.run(params.id, params.societyId, params.dob, params.sex);
	}

	addGuardian(dependantId: string, guardianId: string, share: number): void {
		this.database
			.prepare(`INSERT INTO dependant_guardian (dependant_id, guardian_id, share) VALUES (?, ?, ?)`)
			.run(dependantId, guardianId, share);
	}

	listByGuardian(guardianId: string): DependantRow[] {
		return this.database
			.prepare(
				`SELECT d.id, d.dob, d.sex, d.created_at
				 FROM dependant d
				 JOIN dependant_guardian dg ON d.id = dg.dependant_id
				 WHERE dg.guardian_id = ?
				 ORDER BY d.dob`
			)
			.all(guardianId) as DependantRow[];
	}

	listGuardians(dependantId: string): DependantGuardianRow[] {
		return this.database
			.prepare(`SELECT guardian_id, share FROM dependant_guardian WHERE dependant_id = ?`)
			.all(dependantId) as DependantGuardianRow[];
	}

	isGuardian(dependantId: string, personId: string): boolean {
		return !!this.database
			.prepare(`SELECT 1 FROM dependant_guardian WHERE dependant_id = ? AND guardian_id = ?`)
			.get(dependantId, personId);
	}

	delete(dependantId: string): void {
		this.database.prepare(`DELETE FROM dependant WHERE id = ?`).run(dependantId);
	}
}
