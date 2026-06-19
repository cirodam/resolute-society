import { error } from '@sveltejs/kit';
import { getEncyclopediaEntry } from '$lib/server/content/encyclopedia';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const entry = await getEncyclopediaEntry(params.slug);

	if (!entry) {
		throw error(404, 'Encyclopedia entry not found');
	}

	return {
		entry
	};
};
