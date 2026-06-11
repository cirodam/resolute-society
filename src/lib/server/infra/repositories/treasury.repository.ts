import type postgres from 'postgres';
import { LedgerRepository } from './ledger.repository';

export interface TreasurySocietyRow {
	id: string;
	handle: string;
	name: string;
}

export interface TreasurySummaryRow {
	societyCredits: number;
	personTotal: number;
	associationTotal: number;
	totalSupply: number;
	principalCredits: number;
}

export interface SocietyMemberRow {
	id: string;
	given_name: string;
	surname: string;
	handle: string;
}

export interface SocietyPrincipalRow {
	id: string;
	given_name: string;
	surname: string;
}

export interface SocietyAssociationRow {
	id: string;
	name: string;
}

export class TreasuryRepository {
	private readonly ledger: LedgerRepository;

	constructor(private readonly sql: postgres.Sql) {
		this.ledger = new LedgerRepository(sql);
	}

	async findSocietyById(societyId: string): Promise<TreasurySocietyRow | null> {
		const [row] = await this.sql<TreasurySocietyRow[]>`
			SELECT s_id.value AS id, s_handle.value AS handle, s_name.value AS name
			FROM society_config s_id
			JOIN society_config s_handle ON s_handle.key = 'society.handle'
			JOIN society_config s_name ON s_name.key = 'society.name'
			WHERE s_id.key = 'society.id' AND s_id.value = ${societyId}`;
		return row ?? null;
	}

	async calculateSummary(societyId: string): Promise<TreasurySummaryRow> {
		const { societyBalance, personTotal, associationTotal, totalSupply } =
			await this.ledger.calculateMoneySupply(societyId);

		return {
			societyCredits: societyBalance,
			personTotal,
			associationTotal,
			totalSupply,
			principalCredits: personTotal + associationTotal
		};
	}

	async listSocietyMembers(societyId: string): Promise<SocietyMemberRow[]> {
		return await this.sql<SocietyMemberRow[]>`
			SELECT id, given_name, surname, handle
			FROM person
			WHERE society_id = ${societyId} AND membership_status != 'deleted'
			ORDER BY surname, given_name`;
	}

	async getMemberCount(societyId: string): Promise<number> {
		const [result] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
		return result?.count ?? 0;
	}

	async listSocietyPrincipals(societyId: string): Promise<SocietyPrincipalRow[]> {
		return await this.sql<SocietyPrincipalRow[]>`
			SELECT id, given_name, surname FROM person WHERE society_id = ${societyId} AND membership_status != 'deleted'`;
	}

	async listSocietyAssociations(societyId: string): Promise<SocietyAssociationRow[]> {
		return await this.sql<SocietyAssociationRow[]>`SELECT id, name FROM association WHERE society_id = ${societyId}`;
	}
}
