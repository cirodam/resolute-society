import { listGuideGroups } from '$lib/server/content/guides';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { guideGroups: listGuideGroups() };
};
