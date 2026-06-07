import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = await repositories.societies.findById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society,
		events: await repositories.events.listBySociety(resolveSocietyId(undefined)),
		associations: await repositories.events.listAssociations(resolveSocietyId(undefined))
	};
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

		await getRepositories().events.createEvent({
			eventId: randomUUID(),
			societyId: resolveSocietyId(undefined),
			associationId,
			title,
			description,
			location,
			startsAt,
			endsAt,
			createdBy: locals.person.id
		});

		return { success: true };
	}
};
