import type Database from 'better-sqlite3';

export interface SocietyRow {
	id: string;
	name: string;
}

export interface ItemListingRow {
	id: string;
	type: 'offer' | 'wanted';
	category: string | null;
	title: string;
	description: string;
	society_credits_price: number | null;
	federation_credits_price: number | null;
	created_at: string;
	person_id: string;
	given_name: string;
	surname: string;
	handle: string;
}

export interface ServiceListingRow {
	id: string;
	category: string | null;
	title: string;
	description: string;
	society_credits_rate: number | null;
	federation_credits_rate: number | null;
	rate_unit: string | null;
	created_at: string;
	person_id: string;
	given_name: string;
	surname: string;
	handle: string;
}

export class MarketRepository {
	constructor(private readonly database: Database.Database) {}

	findSociety(societyId: string): SocietyRow | null {
		const society = this.database
			.prepare('SELECT id, name FROM society_config WHERE id = ?')
			.get(societyId) as SocietyRow | undefined;

		return society ?? null;
	}

	listItemListings(societyId: string): ItemListingRow[] {
		return this.database
			.prepare(
				`SELECT il.id, il.type, il.category, il.title, il.description,
				        il.society_credits_price, il.federation_credits_price, il.created_at,
				        p.id as person_id, p.given_name, p.surname, p.handle
				 FROM item_listing il
				 JOIN person p ON p.id = il.person_id
				 WHERE il.society_id = ? AND il.status = 'active'
				 ORDER BY il.created_at DESC`
			)
			.all(societyId) as ItemListingRow[];
	}

	listServiceListings(societyId: string): ServiceListingRow[] {
		return this.database
			.prepare(
				`SELECT sl.id, sl.category, sl.title, sl.description,
				        sl.society_credits_rate, sl.federation_credits_rate, sl.rate_unit, sl.created_at,
				        p.id as person_id, p.given_name, p.surname, p.handle
				 FROM service_listing sl
				 JOIN person p ON p.id = sl.person_id
				 WHERE sl.society_id = ? AND sl.status = 'active'
				 ORDER BY sl.created_at DESC`
			)
			.all(societyId) as ServiceListingRow[];
	}

	findLocalPerson(societyId: string): { id: string } | null {
		const person = this.database
			.prepare('SELECT id FROM person WHERE society_id = ? LIMIT 1')
			.get(societyId) as { id: string } | undefined;

		return person ?? null;
	}

	createItemListing(params: {
		listingId: string;
		societyId: string;
		personId: string;
		type: 'offer' | 'wanted';
		category: string | null;
		title: string;
		description: string;
		societyCreditsPrice: number | null;
		federationCreditsPrice: number | null;
	}): void {
		this.database
			.prepare(
				`INSERT INTO item_listing (id, society_id, person_id, type, category, title, description, society_credits_price, federation_credits_price)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.listingId,
				params.societyId,
				params.personId,
				params.type,
				params.category,
				params.title,
				params.description,
				params.societyCreditsPrice,
				params.federationCreditsPrice
			);
	}

	createServiceListing(params: {
		listingId: string;
		societyId: string;
		personId: string;
		category: string | null;
		title: string;
		description: string;
		societyCreditsRate: number | null;
		federationCreditsRate: number | null;
		rateUnit: string | null;
	}): void {
		this.database
			.prepare(
				`INSERT INTO service_listing (id, society_id, person_id, category, title, description, society_credits_rate, federation_credits_rate, rate_unit)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.listingId,
				params.societyId,
				params.personId,
				params.category,
				params.title,
				params.description,
				params.societyCreditsRate,
				params.federationCreditsRate,
				params.rateUnit
			);
	}
}
