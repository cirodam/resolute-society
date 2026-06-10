import type postgres from 'postgres';
import type { FederationMessageEnvelope, FederationMessageType } from '../../federation/messages';

const RETRY_BASE_SECONDS = 5;
const RETRY_MAX_SECONDS = 3600;
const RETRY_EXPONENT_CAP = 10;
const RETRY_COOLDOWN_ATTEMPT_THRESHOLD = 12;
const RETRY_COOLDOWN_SECONDS = 24 * 60 * 60;

export function getFederationRetryDelaySeconds(nextAttemptCount: number): number {
	if (nextAttemptCount >= RETRY_COOLDOWN_ATTEMPT_THRESHOLD) {
		return RETRY_COOLDOWN_SECONDS;
	}

	const exponent = Math.min(nextAttemptCount, RETRY_EXPONENT_CAP);
	return Math.min(RETRY_MAX_SECONDS, RETRY_BASE_SECONDS * 2 ** exponent);
}

export interface FederationMessageRow {
	id: string;
	type: string;
	society_handle: string;
	payload: string;
	created_at: string;
	last_attempted_at: string | null;
	next_attempted_at: string | null;
	attempt_count: number;
	last_error_message: string | null;
	delivered_at: string | null;
}

export interface FederationAttemptState {
	attemptCount: number;
	nextAttemptAt: string;
	lastErrorMessage: string;
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
	async getPending(): Promise<FederationMessageRow[]> {
		return await this.sql<FederationMessageRow[]>`
			SELECT * FROM federation_message
			WHERE delivered_at IS NULL
			  AND (
			    next_attempted_at IS NULL
			    OR next_attempted_at <= NOW()
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
		await this.sql`
			UPDATE federation_message
			SET delivered_at = NOW(),
			    next_attempted_at = NULL,
			    last_error_message = NULL
			WHERE id = ${id}`;
	}

	async recordAttemptFailure(id: string, errorMessage: string): Promise<FederationAttemptState> {
		const [row] = await this.sql<Array<{ attempt_count: number }>>`
			SELECT attempt_count
			FROM federation_message
			WHERE id = ${id}
			LIMIT 1`;

		const nextAttemptCount = (row?.attempt_count ?? 0) + 1;
		const retryDelaySeconds = getFederationRetryDelaySeconds(nextAttemptCount);
		const nextAttemptAt = new Date(Date.now() + retryDelaySeconds * 1000);
		const truncatedError = errorMessage.slice(0, 500);

		await this.sql`
			UPDATE federation_message
			SET attempt_count = ${nextAttemptCount},
			    last_attempted_at = NOW(),
			    next_attempted_at = ${nextAttemptAt.toISOString()},
			    last_error_message = ${truncatedError}
			WHERE id = ${id}`;

		return {
			attemptCount: nextAttemptCount,
			nextAttemptAt: nextAttemptAt.toISOString(),
			lastErrorMessage: truncatedError
		};
	}
}
