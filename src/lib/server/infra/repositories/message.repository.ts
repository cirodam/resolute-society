import type postgres from 'postgres';
import { randomUUID } from 'crypto';

export interface InboxMessageRow {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	sender_id: string;
	given_name: string;
	surname: string;
	handle: string;
	society_name: string;
	society_handle: string;
}

export interface SentMessageRow {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	recipient_id: string;
	given_name: string;
	surname: string;
	handle: string;
	society_name: string;
	society_handle: string;
}

export interface ArchivedMessageRow {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	sender_id: string;
	recipient_id: string;
	other_person_address: string;
	direction: 'sent' | 'received';
}

export interface RecipientRow {
	id: string;
}

export class MessageRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listInboxMessages(personId: string): Promise<InboxMessageRow[]> {
		return await this.sql<InboxMessageRow[]>`
			SELECT
				m.id, m.subject, m.body, m.created_at, m.read_at,
				p.id as sender_id, p.given_name, p.surname, p.handle,
				s.name as society_name, s.handle as society_handle
			FROM message m
			JOIN person p ON m.sender_id = p.id
			JOIN society_config s ON p.society_id = s.id
			WHERE m.recipient_id = ${personId} AND m.archived_at IS NULL
			ORDER BY m.created_at DESC
			LIMIT 50`;
	}

	async listSentMessages(personId: string): Promise<SentMessageRow[]> {
		return await this.sql<SentMessageRow[]>`
			SELECT
				m.id, m.subject, m.body, m.created_at, m.read_at,
				p.id as recipient_id, p.given_name, p.surname, p.handle,
				s.name as society_name, s.handle as society_handle
			FROM message m
			JOIN person p ON m.recipient_id = p.id
			JOIN society_config s ON p.society_id = s.id
			WHERE m.sender_id = ${personId} AND m.archived_at IS NULL
			ORDER BY m.created_at DESC
			LIMIT 50`;
	}

	async listArchivedMessages(personId: string): Promise<ArchivedMessageRow[]> {
		return await this.sql<ArchivedMessageRow[]>`
			SELECT
				m.id, m.subject, m.body, m.created_at, m.read_at,
				m.sender_id, m.recipient_id,
				CASE
					WHEN m.sender_id = ${personId} THEN p_recipient.handle || '@' || s_recipient.handle
					ELSE p_sender.handle || '@' || s_sender.handle
				END as other_person_address,
				CASE
					WHEN m.sender_id = ${personId} THEN 'sent'
					ELSE 'received'
				END as direction
			FROM message m
			LEFT JOIN person p_sender ON m.sender_id = p_sender.id
			LEFT JOIN society_config s_sender ON p_sender.society_id = s_sender.id
			LEFT JOIN person p_recipient ON m.recipient_id = p_recipient.id
			LEFT JOIN society_config s_recipient ON p_recipient.society_id = s_recipient.id
			WHERE (m.sender_id = ${personId} OR m.recipient_id = ${personId})
				AND m.archived_at IS NOT NULL
			ORDER BY m.archived_at DESC
			LIMIT 50`;
	}

	async getUnreadCount(personId: string): Promise<number> {
		const [result] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM message WHERE recipient_id = ${personId} AND read_at IS NULL AND archived_at IS NULL`;
		return result?.count ?? 0;
	}

	async findRecipientByHandleAndSociety(handle: string, societyHandle: string): Promise<RecipientRow | null> {
		const [row] = await this.sql<RecipientRow[]>`
			SELECT p.id
			FROM person p
			JOIN society_config s ON p.society_id = s.id
			WHERE p.handle = ${handle} AND s.handle = ${societyHandle}`;
		return row ?? null;
	}

	async sendMessage(params: {
		senderId: string;
		recipientId: string;
		subject: string;
		body: string;
	}): Promise<string> {
		const messageId = randomUUID();
		await this.sql`
			INSERT INTO message (id, sender_id, recipient_id, subject, body)
			VALUES (${messageId}, ${params.senderId}, ${params.recipientId}, ${params.subject}, ${params.body})`;
		return messageId;
	}

	async findOwnedMessage(messageId: string, personId: string): Promise<{ id: string } | null> {
		const [row] = await this.sql<Array<{ id: string }>>`
			SELECT id FROM message WHERE id = ${messageId} AND recipient_id = ${personId}`;
		return row ?? null;
	}

	async findVisibleMessage(messageId: string, personId: string): Promise<{ id: string } | null> {
		const [row] = await this.sql<Array<{ id: string }>>`
			SELECT id FROM message WHERE id = ${messageId} AND (sender_id = ${personId} OR recipient_id = ${personId})`;
		return row ?? null;
	}

	async markAsRead(messageId: string): Promise<void> {
		await this.sql`UPDATE message SET read_at = NOW() WHERE id = ${messageId}`;
	}

	async archive(messageId: string): Promise<void> {
		await this.sql`UPDATE message SET archived_at = NOW() WHERE id = ${messageId}`;
	}
}
