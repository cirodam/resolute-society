import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.toString();
	const target = `/dashboard/directory/people${query ? `?${query}` : ''}`;
	throw redirect(307, target);
};
