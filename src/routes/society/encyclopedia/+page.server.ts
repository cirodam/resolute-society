import { listEncyclopediaEntries } from '$lib/server/encyclopedia';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { entries: listEncyclopediaEntries() };
};
