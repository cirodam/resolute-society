import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Determine theme based on URL path
	let theme = 'default';
	if (url.pathname.startsWith('/federation')) {
		theme = 'federation';
	} else if (url.pathname.startsWith('/society') || url.pathname.startsWith('/person')) {
		theme = 'society';
	}

	return {
		person: locals.person,
		theme
	};
};
