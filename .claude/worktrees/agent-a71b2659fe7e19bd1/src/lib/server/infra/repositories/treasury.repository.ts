import type Database from 'better-sqlite3';
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

	constructor(private readonly database: Database.Database) {
		this.ledger = new LedgerRepository(database);
	}

	findSocietyById(societyId: string): TreasurySocietyRow | null {
		return (
			(this.database
				.prepare('SELECT id, handle, name FROM society_config WHERE id = ?')
				.get(societyId) as TreasurySocietyRow | undefined) ?? null
		);
	}

	calculateSummary(societyId: string): TreasurySummaryRow {
		const { societyBalance, personTotal, associationTotal, totalSupply } =
			this.ledger.calculateMoneySupply(societyId);

		return {
			societyCredits: societyBalance,
			personTotal,
			associationTotal,
			totalSupply,
			principalCredits: personTotal + associationTotal
		};
	}

	listSocietyMembers(societyId: string): SocietyMemberRow[] {
		return this.database
			.prepare(
				`SELECT id, given_name, surname, handle
				 FROM person
				 WHERE society_id = ? AND membership_status != 'deleted'
				 ORDER BY surname, given_name`
			)
			.all(societyId) as SocietyMemberRow[];
	}

	getMemberCount(societyId: string): number {
		const result = this.database
			.prepare("SELECT COUNT(*) as count FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.get(societyId) as { count: number } | undefined;

		return result?.count ?? 0;
	}

	listSocietyPrincipals(societyId: string): SocietyPrincipalRow[] {
		return this.database
			.prepare("SELECT id, given_name, surname FROM person WHERE society_id = ? AND membership_status != 'deleted'")
			.all(societyId) as SocietyPrincipalRow[];
	}

	listSocietyAssociations(societyId: string): SocietyAssociationRow[] {
		return this.database
			.prepare('SELECT id, name FROM association WHERE society_id = ?')
			.all(societyId) as SocietyAssociationRow[];
	}
}
