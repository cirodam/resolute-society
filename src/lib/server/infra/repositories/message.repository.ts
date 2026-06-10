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

export interface MessageRecipient {
	type: 'person' | 'association';
	id: string;
}

export interface AssociationInboxMessageRow {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	sender_id: string;
	sender_given_name: string;
	sender_surname: string;
	sender_handle: string;
	sender_association_id: string | null;
	sender_association_name: string | null;
	sender_association_handle: string | null;
}

export interface AssociationSentMessageRow {
	id: string;
	subject: string;
	body: string;
	created_at: string;
	read_at: string | null;
	recipient_id: string | null;
	recipient_given_name: string | null;
	recipient_surname: string | null;
	recipient_handle: string | null;
	recipient_association_id: string | null;
	recipient_association_name: string | null;
	recipient_association_handle: string | null;
}

export class MessageRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async listInboxMessages(personId: string, limit: number, offset: number): Promise<InboxMessageRow[]> {
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
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countInboxMessages(personId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM message WHERE recipient_id = ${personId} AND archived_at IS NULL`;
		return parseInt(row.count, 10);
	}

	async listSentMessages(personId: string, limit: number, offset: number): Promise<SentMessageRow[]> {
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
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countSentMessages(personId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM message WHERE sender_id = ${personId} AND archived_at IS NULL`;
		return parseInt(row.count, 10);
	}

	async listArchivedMessages(personId: string, limit: number, offset: number): Promise<ArchivedMessageRow[]> {
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
			LIMIT ${limit} OFFSET ${offset}`;
	}

	async countArchivedMessages(personId: string): Promise<number> {
		const [row] = await this.sql<[{ count: string }]>`
			SELECT COUNT(*) AS count FROM message
			WHERE (sender_id = ${personId} OR recipient_id = ${personId}) AND archived_at IS NOT NULL`;
		return parseInt(row.count, 10);
	}

	async getUnreadCount(personId: string): Promise<number> {
		const [result] = await this.sql<Array<{ count: number }>>`
			SELECT COUNT(*)::int as count FROM message WHERE recipient_id = ${personId} AND read_at IS NULL AND archived_at IS NULL`;
		return result?.count ?? 0;
	}

	async findMessageRecipient(handle: string, societyHandle: string): Promise<MessageRecipient | null> {
		const [person] = await this.sql<Array<{ id: string }>>`
			SELECT p.id FROM person p
			JOIN society_config s ON p.society_id = s.id
			WHERE p.handle = ${handle} AND s.handle = ${societyHandle}`;
		if (person) return { type: 'person', id: person.id };

		const [assoc] = await this.sql<Array<{ id: string }>>`
			SELECT a.id FROM association a
			JOIN society_config s ON a.society_id = s.id
			WHERE a.handle = ${handle} AND s.handle = ${societyHandle}`;
		if (assoc) return { type: 'association', id: assoc.id };

		return null;
	}

	async sendMessage(params: {
		senderId: string;
		senderAssociationId?: string | null;
		recipientId?: string | null;
		recipientAssociationId?: string | null;
		subject: string;
		body: string;
	}): Promise<string> {
		const messageId = randomUUID();
		await this.sql`
			INSERT INTO message (id, sender_id, sender_association_id, recipient_id, recipient_association_id, subject, body)
			VALUES (
				${messageId},
				${params.senderId},
				${params.senderAssociationId ?? null},
				${params.recipientId ?? null},
				${params.recipientAssociationId ?? null},
				${params.subject},
				${params.body}
			)`;
		return messageId;
	}

	async listInboxForAssociation(associationId: string): Promise<AssociationInboxMessageRow[]> {
		return await this.sql<AssociationInboxMessageRow[]>`
			SELECT
				m.id, m.subject, m.body, m.created_at, m.read_at,
				p.id AS sender_id, p.given_name AS sender_given_name, p.surname AS sender_surname, p.handle AS sender_handle,
				sa.id AS sender_association_id, sa.name AS sender_association_name, sa.handle AS sender_association_handle
			FROM message m
			JOIN person p ON m.sender_id = p.id
			LEFT JOIN association sa ON m.sender_association_id = sa.id
			WHERE m.recipient_association_id = ${associationId} AND m.archived_at IS NULL
			ORDER BY m.created_at DESC
			LIMIT 50`;
	}

	async listSentForAssociation(associationId: string): Promise<AssociationSentMessageRow[]> {
		return await this.sql<AssociationSentMessageRow[]>`
			SELECT
				m.id, m.subject, m.body, m.created_at, m.read_at,
				rp.id AS recipient_id, rp.given_name AS recipient_given_name, rp.surname AS recipient_surname, rp.handle AS recipient_handle,
				ra.id AS recipient_association_id, ra.name AS recipient_association_name, ra.handle AS recipient_association_handle
			FROM message m
			LEFT JOIN person rp ON m.recipient_id = rp.id
			LEFT JOIN association ra ON m.recipient_association_id = ra.id
			WHERE m.sender_association_id = ${associationId} AND m.archived_at IS NULL
			ORDER BY m.created_at DESC
			LIMIT 50`;
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
