import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/infra/db';
import type { PageServerLoad } from './$types';

interface JobStateRow {
	job_name: string;
	last_started_at: Date | string | null;
	last_success_at: Date | string | null;
	last_error_at: Date | string | null;
	last_error_message: string | null;
	lock_until: Date | string | null;
	updated_at: Date | string;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) throw redirect(303, '/login');

	const jobs = await db()<JobStateRow[]>`
		SELECT job_name, last_started_at, last_success_at, last_error_at,
		       last_error_message, lock_until, updated_at
		FROM scheduled_job_state
		ORDER BY job_name`;

	return {
		jobs: jobs.map((j) => ({
			job_name: j.job_name,
			last_started_at: j.last_started_at ? new Date(j.last_started_at).toISOString() : null,
			last_success_at: j.last_success_at ? new Date(j.last_success_at).toISOString() : null,
			last_error_at: j.last_error_at ? new Date(j.last_error_at).toISOString() : null,
			last_error_message: j.last_error_message,
			lock_until: j.lock_until ? new Date(j.lock_until).toISOString() : null,
			updated_at: new Date(j.updated_at).toISOString()
		}))
	};
};
