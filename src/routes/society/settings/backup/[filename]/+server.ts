import { error } from '@sveltejs/kit';
import { streamBackup } from '$lib/server/backup/backup.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.person) {
		throw error(401, 'Unauthorized');
	}

	const { filename } = params;

	try {
		const stream = await streamBackup(filename);
		return new Response(stream, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		throw error(404, message);
	}
};
