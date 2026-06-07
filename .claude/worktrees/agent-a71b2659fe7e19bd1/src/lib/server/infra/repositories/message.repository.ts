import type Database from 'better-sqlite3';
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
	constructor(private readonly database: Database.Database) {}

	listInboxMessages(personId: string): InboxMessageRow[] {
		return this.database
			.prepare(
				`SELECT
					m.id, m.subject, m.body, m.created_at, m.read_at,
					p.id as sender_id, p.given_name, p.surname, p.handle,
					s.name as society_name, s.handle as society_handle
				 FROM message m
				 JOIN person p ON m.sender_id = p.id
				 JOIN society_config s ON p.society_id = s.id
				 WHERE m.recipient_id = ? AND m.archived_at IS NULL
				 ORDER BY m.created_at DESC
				 LIMIT 50`
			)
			.all(personId) as InboxMessageRow[];
	}

	listSentMessages(personId: string): SentMessageRow[] {
		return this.database
			.prepare(
				`SELECT
					m.id, m.subject, m.body, m.created_at, m.read_at,
					p.id as recipient_id, p.given_name, p.surname, p.handle,
					s.name as society_name, s.handle as society_handle
				 FROM message m
				 JOIN person p ON m.recipient_id = p.id
				 JOIN society_config s ON p.society_id = s.id
				 WHERE m.sender_id = ? AND m.archived_at IS NULL
				 ORDER BY m.created_at DESC
				 LIMIT 50`
			)
			.all(personId) as SentMessageRow[];
	}

	listArchivedMessages(personId: string): ArchivedMessageRow[] {
		return this.database
			.prepare(
				`SELECT
					m.id, m.subject, m.body, m.created_at, m.read_at,
					m.sender_id, m.recipient_id,
					CASE
						WHEN m.sender_id = ? THEN p_recipient.handle || '@' || s_recipient.handle
						ELSE p_sender.handle || '@' || s_sender.handle
					END as other_person_address,
					CASE
						WHEN m.sender_id = ? THEN 'sent'
						ELSE 'received'
					END as direction
				 FROM message m
				 LEFT JOIN person p_sender ON m.sender_id = p_sender.id
				 LEFT JOIN society_config s_sender ON p_sender.society_id = s_sender.id
				 LEFT JOIN person p_recipient ON m.recipient_id = p_recipient.id
				 LEFT JOIN society_config s_recipient ON p_recipient.society_id = s_recipient.id
				 WHERE (m.sender_id = ? OR m.recipient_id = ?)
					 AND m.archived_at IS NOT NULL
				 ORDER BY m.archived_at DESC
				 LIMIT 50`
			)
			.all(personId, personId, personId, personId) as ArchivedMessageRow[];
	}

	getUnreadCount(personId: string): number {
		const result = this.database
			.prepare(
				'SELECT COUNT(*) as count FROM message WHERE recipient_id = ? AND read_at IS NULL AND archived_at IS NULL'
			)
			.get(personId) as { count: number } | undefined;

		return result?.count ?? 0;
	}

	findRecipientByHandleAndSociety(handle: string, societyHandle: string): RecipientRow | null {
		const recipient = this.database
			.prepare(
				`SELECT p.id
				 FROM person p
				 JOIN society_config s ON p.society_id = s.id
				 WHERE p.handle = ? AND s.handle = ?`
			)
			.get(handle, societyHandle) as RecipientRow | undefined;

		return recipient ?? null;
	}

	sendMessage(params: {
		senderId: string;
		recipientId: string;
		subject: string;
		body: string;
	}): string {
		const messageId = randomUUID();
		this.database
			.prepare(
				`INSERT INTO message (id, sender_id, recipient_id, subject, body)
				 VALUES (?, ?, ?, ?, ?)`
			)
			.run(messageId, params.senderId, params.recipientId, params.subject, params.body);

		return messageId;
	}

	findOwnedMessage(messageId: string, personId: string): { id: string } | null {
		const message = this.database
			.prepare('SELECT id FROM message WHERE id = ? AND recipient_id = ?')
			.get(messageId, personId) as { id: string } | undefined;

		return message ?? null;
	}

	findVisibleMessage(messageId: string, personId: string): { id: string } | null {
		const message = this.database
			.prepare('SELECT id FROM message WHERE id = ? AND (sender_id = ? OR recipient_id = ?)')
			.get(messageId, personId, personId) as { id: string } | undefined;

		return message ?? null;
	}

	markAsRead(messageId: string): void {
		this.database.prepare("UPDATE message SET read_at = datetime('now') WHERE id = ?").run(messageId);
	}

	archive(messageId: string): void {
		this.database
			.prepare("UPDATE message SET archived_at = datetime('now') WHERE id = ?")
			.run(messageId);
	}
}
