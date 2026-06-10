import type postgres from 'postgres';

export interface AuditEventRow {
	id: string;
	society_id: string;
	actor_person_id: string | null;
	actor_display: string;
	event_type: string;
	target_type: string;
	target_id: string;
	summary: string;
	metadata_json: string;
	request_id: string | null;
	occurred_at: string;
}

export interface AppendAuditEventParams {
	id: string;
	societyId: string;
	actorPersonId: string | null;
	actorDisplay: string;
	eventType: string;
	targetType: string;
	targetId: string;
	summary: string;
	metadataJson: string;
}

export class AuditEventRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async append(params: AppendAuditEventParams): Promise<void> {
		await this.sql`
			INSERT INTO audit_event (id, society_id, actor_person_id, actor_display, event_type, target_type, target_id, summary, metadata_json)
			VALUES (
				${params.id},
				${params.societyId},
				${params.actorPersonId},
				${params.actorDisplay},
				${params.eventType},
				${params.targetType},
				${params.targetId},
				${params.summary},
				${params.metadataJson}
			)`;
	}

	async listBySociety(societyId: string, limit = 100): Promise<AuditEventRow[]> {
		return await this.sql<AuditEventRow[]>`
			SELECT * FROM audit_event
			WHERE society_id = ${societyId}
			ORDER BY occurred_at DESC
			LIMIT ${limit}`;
	}
}
