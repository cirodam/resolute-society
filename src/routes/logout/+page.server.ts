import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ cookies }) => {
		cookies.delete('rs_session', { path: '/' });
		throw redirect(303, '/login');
	}
} satisfies Actions;
