import { getRepositories } from '../infra/repositories';
import { error, type RequestEvent } from '@sveltejs/kit';

export function hasPermission(check: {
	personId: string;
	societyId: string;
	permissionCode: string;
}): boolean {
	return getRepositories().permissions.hasPermission(check);
}

export function requirePermission(
	event: RequestEvent,
	permissionCode: string,
	societyId?: string
): void {
	if (!event.locals.person) {
		throw error(401, 'Not authenticated');
	}

	const targetSocietyId = societyId || event.params.id;

	if (!targetSocietyId) {
		throw error(400, 'Society ID required');
	}

	if (event.locals.person.society_id !== targetSocietyId) {
		throw error(403, 'Access denied - you are not a member of this society');
	}

	const authorized = hasPermission({
		personId: event.locals.person.id,
		societyId: targetSocietyId,
		permissionCode
	});

	if (!authorized) {
		throw error(403, `Permission denied: ${permissionCode}`);
	}
}