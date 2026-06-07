import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';
import { calculateBalance } from '$lib/server/services/ledger.service';
import { getFederationBalance } from '$lib/server/federation/client';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = repositories.societies.findDetailById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const societyCredits = calculateBalance('society', resolveSocietyId(undefined));
	const federationCredits = await getFederationBalance(`treasury@${society.id}`);

	return {
		society: {
			...society,
			society_credits: societyCredits,
			federation_credits: federationCredits
		},
		posts: repositories.posts.listSocietyPosts(resolveSocietyId(undefined))
	};
};

export const actions: Actions = {
	createPost: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { error: 'Not authenticated' });
		}

		const data = await request.formData();
		const title = data.get('title')?.toString();
		const body = data.get('body')?.toString();

		if (!title || !body) {
			return fail(400, { error: 'Title and body are required' });
		}

		getRepositories().posts.createSocietyPost({
			postId: randomUUID(),
			societyId: resolveSocietyId(undefined),
			authorId: locals.person.id,
			title,
			body
		});

		return { success: true };
	}
};
