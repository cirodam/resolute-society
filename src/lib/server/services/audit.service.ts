import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';

interface Actor {
	id: string;
	handle: string;
	name: string;
}

interface AuditParams {
	actor: Actor | null | undefined;
	societyId: string;
	eventType: string;
	targetType: string;
	targetId: string;
	summary: string;
	metadata?: Record<string, unknown>;
}

export async function audit(params: AuditParams): Promise<void> {
	await getRepositories().auditEvents.append({
		id: randomUUID(),
		societyId: params.societyId,
		actorPersonId: params.actor?.id ?? null,
		actorDisplay: params.actor ? `${params.actor.name} (@${params.actor.handle})` : 'system',
		eventType: params.eventType,
		targetType: params.targetType,
		targetId: params.targetId,
		summary: params.summary,
		metadataJson: JSON.stringify(params.metadata ?? {})
	});
}
