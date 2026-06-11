import { fail, redirect } from '@sveltejs/kit';
import { restoreFromUpload } from '$lib/server/backup/backup.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('backup');

		if (!file || !(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Please select a backup file.' });
		}

		if (!file.name.endsWith('.dump')) {
			return fail(400, { error: 'File must be a .dump backup file.' });
		}

		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			await restoreFromUpload(buffer);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('[restore] failed:', message);
			return fail(500, { error: `Restore failed: ${message}` });
		}

		throw redirect(303, '/login');
	}
};
