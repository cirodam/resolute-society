import type postgres from 'postgres';

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
	constructor(private readonly sql: postgres.Sql) {}

	async create(params: { id: string; societyId: string; dob: string; sex: 'male' | 'female' | 'other' | null }): Promise<void> {
		await this.sql`INSERT INTO dependant (id, society_id, dob, sex) VALUES (${params.id}, ${params.societyId}, ${params.dob}, ${params.sex})`;
	}

	async addGuardian(dependantId: string, guardianId: string, share: number): Promise<void> {
		await this.sql`INSERT INTO dependant_guardian (dependant_id, guardian_id, share) VALUES (${dependantId}, ${guardianId}, ${share})`;
	}

	async listByGuardian(guardianId: string): Promise<DependantRow[]> {
		return await this.sql<DependantRow[]>`
			SELECT d.id, d.dob, d.sex, d.created_at
			FROM dependant d
			JOIN dependant_guardian dg ON d.id = dg.dependant_id
			WHERE dg.guardian_id = ${guardianId}
			ORDER BY d.dob`;
	}

	async listGuardians(dependantId: string): Promise<DependantGuardianRow[]> {
		return await this.sql<DependantGuardianRow[]>`
			SELECT guardian_id, share FROM dependant_guardian WHERE dependant_id = ${dependantId}`;
	}

	async isGuardian(dependantId: string, personId: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM dependant_guardian WHERE dependant_id = ${dependantId} AND guardian_id = ${personId}`;
		return !!existing;
	}

	async listBySociety(societyId: string): Promise<Array<{ dob: string; sex: 'male' | 'female' | 'other' | null }>> {
		return await this.sql<Array<{ dob: string; sex: 'male' | 'female' | 'other' | null }>>`
			SELECT dob, sex FROM dependant WHERE society_id = ${societyId}`;
	}

	async delete(dependantId: string): Promise<void> {
		await this.sql`DELETE FROM dependant WHERE id = ${dependantId}`;
	}
}
