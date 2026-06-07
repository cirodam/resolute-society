import { json, error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';

export async function POST({ request }: { request: Request }) {
	const body = await request.json();
	const { lat, lng, label } = body;

	if (typeof lat !== 'number' || typeof lng !== 'number') {
		throw error(400, 'lat and lng are required numbers');
	}

	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const node = await repos.roadGraph.createNode({ id: randomUUID(), societyId, lat, lng, label: label ?? null });

	return json(node);
}
