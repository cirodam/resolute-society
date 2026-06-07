import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { joinFederation } from '$lib/server/federation/client';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = repositories.societies.findDetailById(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const rows = repositories.federationMessageQueue.listBySocietyHandle(society.handle);

	const messages = rows.map((row) => ({
		id: row.id,
		type: row.type,
		payload: JSON.parse(row.payload) as Record<string, unknown>,
		societyHandle: row.society_handle,
		createdAt: row.created_at,
		lastAttemptedAt: row.last_attempted_at,
		attemptCount: row.attempt_count,
		deliveredAt: row.delivered_at,
		status: row.delivered_at
			? ('delivered' as const)
			: row.attempt_count >= 5
				? ('stalled' as const)
				: ('pending' as const)
	}));

	const delivered = messages.filter((m) => m.status === 'delivered').length;
	const pending = messages.filter((m) => m.status === 'pending').length;
	const stalled = messages.filter((m) => m.status === 'stalled').length;

	const keypair = repositories.keypair.get();

	return {
		society,
		messages,
		summary: { total: messages.length, delivered, pending, stalled },
		publicKey: keypair?.public_key ?? null
	};
};

export const actions: Actions = {
	join: async ({ request }) => {
		const data = await request.formData();
		const secret = data.get('secret')?.toString().trim();

		if (!secret) {
			return fail(400, { joinError: 'Secret is required' });
		}

		try {
			joinFederation(secret);
		} catch (err) {
			return fail(500, { joinError: (err as Error).message });
		}

		return { joinQueued: true };
	}
};
