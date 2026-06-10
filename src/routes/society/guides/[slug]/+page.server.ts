import { error } from '@sveltejs/kit';
import { getGuide } from '$lib/server/guides';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const guide = await getGuide(params.slug);

	if (!guide) {
		throw error(404, 'Guide not found');
	}

	return {
		guide
	};
};
