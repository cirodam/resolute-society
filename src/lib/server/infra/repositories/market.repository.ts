import type postgres from 'postgres';

export interface ItemListingRow {
	id: string;
	type: 'offer' | 'wanted';
	category: string | null;
	title: string;
	description: string;
	society_credits_price: number | null;
	federation_credits_price: number | null;
	status: string;
	created_at: string;
	closed_at: string | null;
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
	status: string;
	created_at: string;
	person_id: string;
	given_name: string;
	surname: string;
	handle: string;
}

export class MarketRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listItemListings(societyId: string, limit: number, offset: number): Promise<ItemListingRow[]> {
		return await this.sql<ItemListingRow[]>`
			SELECT il.id, il.type, il.category, il.title, il.description,
			       il.society_credits_price, il.federation_credits_price,
			       il.status, il.created_at, il.closed_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM item_listing il
			JOIN person p ON p.id = il.person_id
			WHERE il.society_id = ${societyId} AND il.status = 'active'
			ORDER BY il.created_at DESC
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countItemListings(societyId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM item_listing WHERE society_id = ${societyId} AND status = 'active'`;
		return parseInt(row.count, 10);
	}

	async listServiceListings(societyId: string, limit: number, offset: number): Promise<ServiceListingRow[]> {
		return await this.sql<ServiceListingRow[]>`
			SELECT sl.id, sl.category, sl.title, sl.description,
			       sl.society_credits_rate, sl.federation_credits_rate, sl.rate_unit,
			       sl.status, sl.created_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM service_listing sl
			JOIN person p ON p.id = sl.person_id
			WHERE sl.society_id = ${societyId} AND sl.status = 'active'
			ORDER BY sl.created_at DESC
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countServiceListings(societyId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM service_listing WHERE society_id = ${societyId} AND status = 'active'`;
		return parseInt(row.count, 10);
	}

	async listItemListingsByPerson(societyId: string, personId: string): Promise<ItemListingRow[]> {
		return await this.sql<ItemListingRow[]>`
			SELECT il.id, il.type, il.category, il.title, il.description,
			       il.society_credits_price, il.federation_credits_price,
			       il.status, il.created_at, il.closed_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM item_listing il
			JOIN person p ON p.id = il.person_id
			WHERE il.society_id = ${societyId} AND il.person_id = ${personId} AND il.status = 'active'
			ORDER BY il.created_at DESC`;
	}

	async listServiceListingsByPerson(societyId: string, personId: string): Promise<ServiceListingRow[]> {
		return await this.sql<ServiceListingRow[]>`
			SELECT sl.id, sl.category, sl.title, sl.description,
			       sl.society_credits_rate, sl.federation_credits_rate, sl.rate_unit,
			       sl.status, sl.created_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM service_listing sl
			JOIN person p ON p.id = sl.person_id
			WHERE sl.society_id = ${societyId} AND sl.person_id = ${personId} AND sl.status = 'active'
			ORDER BY sl.created_at DESC`;
	}

	async findItemListing(id: string): Promise<ItemListingRow | null> {
		const [row] = await this.sql<ItemListingRow[]>`
			SELECT il.id, il.type, il.category, il.title, il.description,
			       il.society_credits_price, il.federation_credits_price,
			       il.status, il.created_at, il.closed_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM item_listing il
			JOIN person p ON p.id = il.person_id
			WHERE il.id = ${id}`;
		return row ?? null;
	}

	async findServiceListing(id: string): Promise<ServiceListingRow | null> {
		const [row] = await this.sql<ServiceListingRow[]>`
			SELECT sl.id, sl.category, sl.title, sl.description,
			       sl.society_credits_rate, sl.federation_credits_rate, sl.rate_unit,
			       sl.status, sl.created_at,
			       p.id as person_id, p.given_name, p.surname, p.handle
			FROM service_listing sl
			JOIN person p ON p.id = sl.person_id
			WHERE sl.id = ${id}`;
		return row ?? null;
	}

	async updateItemListing(id: string, params: {
		category: string | null;
		title: string;
		description: string;
		societyCreditsPrice: number | null;
		federationCreditsPrice: number | null;
	}): Promise<void> {
		await this.sql`
			UPDATE item_listing
			SET category = ${params.category}, title = ${params.title},
			    description = ${params.description},
			    society_credits_price = ${params.societyCreditsPrice},
			    federation_credits_price = ${params.federationCreditsPrice}
			WHERE id = ${id}`;
	}

	async updateServiceListing(id: string, params: {
		category: string | null;
		title: string;
		description: string;
		societyCreditsRate: number | null;
		federationCreditsRate: number | null;
		rateUnit: string | null;
	}): Promise<void> {
		await this.sql`
			UPDATE service_listing
			SET category = ${params.category}, title = ${params.title},
			    description = ${params.description},
			    society_credits_rate = ${params.societyCreditsRate},
			    federation_credits_rate = ${params.federationCreditsRate},
			    rate_unit = ${params.rateUnit}
			WHERE id = ${id}`;
	}

	async closeItemListing(id: string, status: 'sold' | 'closed'): Promise<void> {
		await this.sql`
			UPDATE item_listing SET status = ${status}, closed_at = NOW() WHERE id = ${id}`;
	}

	async deactivateServiceListing(id: string): Promise<void> {
		await this.sql`UPDATE service_listing SET status = 'inactive' WHERE id = ${id}`;
	}

	async createItemListing(params: {
		listingId: string;
		societyId: string;
		personId: string;
		type: 'offer' | 'wanted';
		category: string | null;
		title: string;
		description: string;
		societyCreditsPrice: number | null;
		federationCreditsPrice: number | null;
	}): Promise<void> {
		await this.sql`
			INSERT INTO item_listing (id, society_id, person_id, type, category, title, description, society_credits_price, federation_credits_price)
			VALUES (${params.listingId}, ${params.societyId}, ${params.personId}, ${params.type}, ${params.category}, ${params.title}, ${params.description}, ${params.societyCreditsPrice}, ${params.federationCreditsPrice})`;
	}

	async createServiceListing(params: {
		listingId: string;
		societyId: string;
		personId: string;
		category: string | null;
		title: string;
		description: string;
		societyCreditsRate: number | null;
		federationCreditsRate: number | null;
		rateUnit: string | null;
	}): Promise<void> {
		await this.sql`
			INSERT INTO service_listing (id, society_id, person_id, category, title, description, society_credits_rate, federation_credits_rate, rate_unit)
			VALUES (${params.listingId}, ${params.societyId}, ${params.personId}, ${params.category}, ${params.title}, ${params.description}, ${params.societyCreditsRate}, ${params.federationCreditsRate}, ${params.rateUnit})`;
	}
}
