import type { RequestEvent } from '@sveltejs/kit';
import { requirePermission } from '$lib/server/services/auth.service';

export type PermissionChecker = (
	event: RequestEvent,
	permissionCode: string,
	societyId?: string
) => void;

export function requireSocietyTreasuryPermission(params: {
	event: RequestEvent;
	societyId: string;
	permissionCode: string;
	checkPermission?: PermissionChecker;
}): void {
	const checkPermission = params.checkPermission ?? requirePermission;
	checkPermission(params.event, params.permissionCode, params.societyId);
}

export function requireFederationEconomyPermission(params: {
	event: RequestEvent;
	permissionCode: string;
	checkPermission?: PermissionChecker;
}): void {
	const checkPermission = params.checkPermission ?? requirePermission;
	const societyId = params.event.locals.person?.society_id;
	checkPermission(params.event, params.permissionCode, societyId);
}
