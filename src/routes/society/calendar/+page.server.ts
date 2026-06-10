import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const repositories = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repositories.societies.findById(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const now = new Date();
	const year = parseInt(url.searchParams.get('year') ?? String(now.getFullYear()), 10);
	const month = parseInt(url.searchParams.get('month') ?? String(now.getMonth() + 1), 10);

	const [events, associations] = await Promise.all([
		repositories.events.listByMonth(societyId, year, month),
		repositories.events.listAssociations(societyId)
	]);

	return { society, events, associations, year, month };
};

export const actions: Actions = {
	createEvent: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { error: 'Must be logged in to create events' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString() || null;
		const location = formData.get('location')?.toString() || null;
		const startsAt = formData.get('starts_at')?.toString();
		const endsAt = formData.get('ends_at')?.toString() || null;
		const associationId = formData.get('association_id')?.toString() || null;

		if (!title || !startsAt) {
			return fail(400, { error: 'Title and start time are required' });
		}

		const eventId = randomUUID();
		const societyId = resolveSocietyId(undefined);
		await getRepositories().events.createEvent({
			eventId,
			societyId,
			associationId,
			title,
			description,
			location,
			startsAt,
			endsAt,
			createdBy: locals.person.id
		});

		await audit({
			actor: locals.person,
			societyId,
			eventType: 'CALENDAR_EVENT_CREATED',
			targetType: 'event',
			targetId: eventId,
			summary: `Event "${title}" created`,
			metadata: { title, startsAt, endsAt, location, associationId }
		});

		return { success: true };
	}
};
