import { getRepositories } from '$lib/server/infra/repositories';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 3958.8;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.asin(Math.sqrt(a));
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) throw error(401, 'Not authenticated');

	const repos = getRepositories();
	const me = await repos.people.findProfileById(locals.person.id);
	if (!me) throw error(404, 'Person not found');

	const myLocation = me.location_id
		? await repos.locations.findById(me.location_id)
		: null;

	if (!myLocation) {
		return { hasLocation: false as const, neighbors: [] };
	}

	const others = await repos.people.listWithLocation(me.society_id);

	const RADIUS_MILES = 3;

	const neighbors = others
		.filter((p) => p.id !== me.id)
		.map((p) => ({
			id: p.id,
			given_name: p.given_name,
			surname: p.surname,
			handle: p.handle,
			location_name: p.location_name,
			distance_miles: haversineMiles(myLocation.lat, myLocation.lng, p.lat, p.lng)
		}))
		.filter((p) => p.distance_miles <= RADIUS_MILES)
		.sort((a, b) => a.distance_miles - b.distance_miles);

	return { hasLocation: true as const, neighbors };
};
