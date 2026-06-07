import type Database from 'better-sqlite3';
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
	constructor(private readonly database: Database.Database) {}

	enqueue<T extends FederationMessageType>(message: FederationMessageEnvelope<T>): void {
		this.database
			.prepare(
				`INSERT INTO federation_message (id, type, society_handle, payload)
				 VALUES (?, ?, ?, ?)`
			)
			.run(message.id, message.type, message.societyHandle, JSON.stringify(message.payload));
	}

	listBySocietyHandle(societyHandle: string): FederationMessageRow[] {
		return this.database
			.prepare(
				`SELECT * FROM federation_message
				 WHERE society_handle = ?
				 ORDER BY created_at DESC`
			)
			.all(societyHandle) as FederationMessageRow[];
	}

	// Returns messages not yet delivered and past their backoff window.
	// Backoff: min(3600, 5 * 2^attempt_count) seconds.
	getPending(): FederationMessageRow[] {
		return this.database
			.prepare(
				`SELECT * FROM federation_message
				 WHERE delivered_at IS NULL
				   AND (
				     last_attempted_at IS NULL
				     OR (unixepoch('now') - unixepoch(last_attempted_at))
				        > min(3600, 5 * (1 << min(attempt_count, 10)))
				   )
				 ORDER BY created_at ASC`
			)
			.all() as FederationMessageRow[];
	}

	isAdmitted(societyHandle: string): boolean {
		const row = this.database
			.prepare(
				`SELECT 1 FROM federation_message
				 WHERE type = 'society_join'
				   AND society_handle = ?
				   AND delivered_at IS NOT NULL
				 LIMIT 1`
			)
			.get(societyHandle);
		return !!row;
	}

	markDelivered(id: string): void {
		this.database
			.prepare(`UPDATE federation_message SET delivered_at = datetime('now') WHERE id = ?`)
			.run(id);
	}

	recordAttempt(id: string): void {
		this.database
			.prepare(
				`UPDATE federation_message
				 SET attempt_count     = attempt_count + 1,
				     last_attempted_at = datetime('now')
				 WHERE id = ?`
			)
			.run(id);
	}
}
