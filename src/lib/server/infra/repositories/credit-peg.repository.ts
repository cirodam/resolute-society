import type postgres from 'postgres';

export interface CreditPegConfig {
	itemName: string | null;
	creditsPerItem: number | null;
}

export interface CreditPegObservationRow {
	id: string;
	observed_on: string;
	store_name: string | null;
	price_cents: number;
	recorded_by_id: string | null;
	recorded_by_name: string | null;
	created_at: string;
}

export class CreditPegRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async getConfig(): Promise<CreditPegConfig> {
		const rows = await this.sql<Array<{ key: string; value: string }>>`
			SELECT key, value FROM society_config WHERE key IN ('credit_peg.item_name', 'credit_peg.credits_per_item')
		`;
		const kv = new Map(rows.map((r) => [r.key, r.value]));
		const rawCredits = kv.get('credit_peg.credits_per_item');
		const parsed = rawCredits ? parseFloat(rawCredits) : null;
		return {
			itemName: kv.get('credit_peg.item_name') ?? null,
			creditsPerItem: parsed !== null && !isNaN(parsed) ? parsed : null
		};
	}

	async setConfig(itemName: string, creditsPerItem: number): Promise<void> {
		const keys = ['credit_peg.item_name', 'credit_peg.credits_per_item'];
		const values = [itemName, String(creditsPerItem)];
		await this.sql`
			INSERT INTO society_config (key, value)
			SELECT * FROM UNNEST(${keys}::text[], ${values}::text[])
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
		`;
	}

	async addObservation(params: {
		id: string;
		observedOn: string;
		storeName: string | null;
		priceCents: number;
		recordedById: string;
	}): Promise<void> {
		await this.sql`
			INSERT INTO credit_peg_observation (id, observed_on, store_name, price_cents, recorded_by_id)
			VALUES (${params.id}, ${params.observedOn}, ${params.storeName}, ${params.priceCents}, ${params.recordedById})
		`;
	}

	async listObservations(limit = 20): Promise<CreditPegObservationRow[]> {
		return await this.sql<CreditPegObservationRow[]>`
			SELECT
				o.id,
				o.observed_on,
				o.store_name,
				o.price_cents,
				o.recorded_by_id,
				p.given_name || ' ' || p.surname AS recorded_by_name,
				o.created_at
			FROM credit_peg_observation o
			LEFT JOIN person p ON p.id = o.recorded_by_id
			ORDER BY o.observed_on DESC, o.created_at DESC
			LIMIT ${limit}
		`;
	}

	async getLatestObservation(): Promise<CreditPegObservationRow | null> {
		const rows = await this.sql<CreditPegObservationRow[]>`
			SELECT
				o.id,
				o.observed_on,
				o.store_name,
				o.price_cents,
				o.recorded_by_id,
				p.given_name || ' ' || p.surname AS recorded_by_name,
				o.created_at
			FROM credit_peg_observation o
			LEFT JOIN person p ON p.id = o.recorded_by_id
			ORDER BY o.observed_on DESC, o.created_at DESC
			LIMIT 1
		`;
		return rows[0] ?? null;
	}
}
