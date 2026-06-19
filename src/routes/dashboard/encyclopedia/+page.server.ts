import { listEncyclopediaEntries } from '$lib/server/content/encyclopedia';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { entries: listEncyclopediaEntries() };
};
