import { json, error } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST({ request }: { request: Request }) {
	const body = await request.json();
	const { nodeAId, nodeBId } = body;

	if (!nodeAId || !nodeBId) throw error(400, 'nodeAId and nodeBId are required');
	if (nodeAId === nodeBId) throw error(400, 'Cannot connect a node to itself');

	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);

	const nodes = await repos.roadGraph.listNodesBySociety(societyId);
	const nodeA = nodes.find(n => n.id === nodeAId);
	const nodeB = nodes.find(n => n.id === nodeBId);
	if (!nodeA || !nodeB) throw error(404, 'One or both nodes not found');

	const distanceKm = haversine(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
	const edge = await repos.roadGraph.createEdge({ id: randomUUID(), societyId, nodeAId, nodeBId, distanceKm });

	return json(edge);
}
