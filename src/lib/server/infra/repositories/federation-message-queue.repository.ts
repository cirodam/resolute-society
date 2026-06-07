import type postgres from 'postgres';
import type { FederationMessageEnvelope, FederationMessageType } from '../../federation/messages';

export interface FederationMessageRow {
	id: string;
	type: string;
	society_handle: string;
	payload: string;
	created_at: string;
	last_attempted_at: string | null;
	attempt_count: number;
	delivered_at: string | null;
}

export class FederationMessageQueueRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async enqueue<T extends FederationMessageType>(message: FederationMessageEnvelope<T>): Promise<void> {
		await this.sql`
			INSERT INTO federation_message (id, type, society_handle, payload)
			VALUES (${message.id}, ${message.type}, ${message.societyHandle}, ${JSON.stringify(message.payload)})`;
	}

	async listBySocietyHandle(societyHandle: string): Promise<FederationMessageRow[]> {
		return await this.sql<FederationMessageRow[]>`
			SELECT * FROM federation_message
			WHERE society_handle = ${societyHandle}
			ORDER BY created_at DESC`;
	}

	// Returns messages not yet delivered and past their backoff window.
	// Backoff: min(3600, 5 * 2^attempt_count) seconds.
	async getPending(): Promise<FederationMessageRow[]> {
		return await this.sql<FederationMessageRow[]>`
			SELECT * FROM federation_message
			WHERE delivered_at IS NULL
			  AND (
			    last_attempted_at IS NULL
			    OR EXTRACT(EPOCH FROM (NOW() - last_attempted_at))
			       > LEAST(3600, 5 * (1 << LEAST(attempt_count, 10)))
			  )
			ORDER BY created_at ASC`;
	}

	async isAdmitted(societyHandle: string): Promise<boolean> {
		const [row] = await this.sql`
			SELECT 1 FROM federation_message
			WHERE type = 'society_join'
			  AND society_handle = ${societyHandle}
			  AND delivered_at IS NOT NULL
			LIMIT 1`;
		return !!row;
	}

	async markDelivered(id: string): Promise<void> {
		await this.sql`UPDATE federation_message SET delivered_at = NOW() WHERE id = ${id}`;
	}

	async recordAttempt(id: string): Promise<void> {
		await this.sql`
			UPDATE federation_message
			SET attempt_count     = attempt_count + 1,
			    last_attempted_at = NOW()
			WHERE id = ${id}`;
	}
}
