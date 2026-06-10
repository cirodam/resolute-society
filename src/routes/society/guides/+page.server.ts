import { listGuideGroups, listGuides } from '$lib/server/guides';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		guides: listGuides(),
		guideGroups: listGuideGroups()
	};
};
