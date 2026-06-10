import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ params, url }) => {
	const societyId = resolveSocietyId(undefined);
	const repos = getRepositories();

	const post = await repos.posts.findById(params.id, societyId);
	if (!post) error(404, 'Post not found');

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const offset = (page - 1) * PAGE_SIZE;

	const [replies, totalReplies] = await Promise.all([
		repos.posts.listReplies(params.id, PAGE_SIZE, offset),
		repos.posts.countReplies(params.id)
	]);

	return {
		post,
		replies,
		page,
		totalPages: Math.max(1, Math.ceil(totalReplies / PAGE_SIZE)),
		totalReplies
	};
};

export const actions: Actions = {
	reply: async ({ request, params, locals }) => {
		if (!locals.person) error(401, 'Not authenticated');

		const data = await request.formData();
		const body = (data.get('body') as string | null)?.trim();
		if (!body) return { replyError: 'Comment cannot be empty.' };

		const societyId = resolveSocietyId(undefined);
		const repos = getRepositories();

		const post = await repos.posts.findById(params.id, societyId);
		if (!post) error(404, 'Post not found');

		await repos.posts.createReply({
			replyId: randomUUID(),
			postId: params.id,
			authorId: locals.person.id,
			body
		});

		redirect(303, `/society/bulletin/${params.id}`);
	}
};
