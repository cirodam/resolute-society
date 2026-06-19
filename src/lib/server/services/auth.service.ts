import { getRepositories } from '../infra/repositories';
import { error, type RequestEvent } from '@sveltejs/kit';

export async function requirePermission(
	event: RequestEvent,
	permissionCode: string,
	societyId?: string
): Promise<void> {
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

	const authorized = await getRepositories().permissions.hasPermission({
		personId: event.locals.person.id,
		societyId: targetSocietyId,
		permissionCode
	});

	if (!authorized) {
		throw error(403, `Permission denied: ${permissionCode}`);
	}
}
