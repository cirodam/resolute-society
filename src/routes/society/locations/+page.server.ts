import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const repos = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repos.societies.findDetailById(societyId);
	if (!society) throw error(404, 'Society not found');

	const prefilledLat = url.searchParams.get('lat');
	const prefilledLng = url.searchParams.get('lng');

	return {
		locations: await repos.locations.listBySociety(societyId),
		categories: await repos.locationCategories.listBySociety(societyId),
		prefilledLat: prefilledLat ? parseFloat(prefilledLat) : null,
		prefilledLng: prefilledLng ? parseFloat(prefilledLng) : null
	};
};

export const actions: Actions = {
	createCategory: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const color = data.get('color')?.toString() || '#7a5c1a';
		if (!name) return fail(400, { categoryError: 'Name is required' });
		await getRepositories().locationCategories.create({
			id: randomUUID(),
			societyId: resolveSocietyId(undefined),
			name,
			color
		});
		return { categoryCreated: true };
	},

	updateCategory: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const color = data.get('color')?.toString() || '#7a5c1a';
		if (!id || !name) return fail(400, { categoryError: 'Invalid request' });
		await getRepositories().locationCategories.update({ id, name, color });
		return { categoryUpdated: true };
	},

	deleteCategory: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { categoryError: 'ID required' });
		await getRepositories().locationCategories.delete(id);
		return { categoryDeleted: true };
	},

	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const categoryId = data.get('category_id')?.toString() || null;
		const address = data.get('address')?.toString().trim() || null;
		const lat = parseFloat(data.get('lat')?.toString() || '');
		const lng = parseFloat(data.get('lng')?.toString() || '');
		const notes = data.get('notes')?.toString().trim() || null;

		if (!name) return fail(400, { createError: 'Name is required' });
		if (isNaN(lat) || isNaN(lng)) return fail(400, { createError: 'Valid coordinates are required' });

		await getRepositories().locations.create({
			id: randomUUID(),
			societyId: resolveSocietyId(undefined),
			name,
			categoryId,
			address,
			lat,
			lng,
			notes
		});
		return { created: true };
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const categoryId = data.get('category_id')?.toString() || null;
		const address = data.get('address')?.toString().trim() || null;
		const lat = parseFloat(data.get('lat')?.toString() || '');
		const lng = parseFloat(data.get('lng')?.toString() || '');
		const notes = data.get('notes')?.toString().trim() || null;

		if (!id) return fail(400, { updateError: 'ID is required' });
		if (!name) return fail(400, { updateError: 'Name is required' });
		if (isNaN(lat) || isNaN(lng)) return fail(400, { updateError: 'Valid coordinates are required' });

		await getRepositories().locations.update({ id, name, categoryId, address, lat, lng, notes });
		return { updated: true };
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { deleteError: 'ID is required' });
		await getRepositories().locations.delete(id);
		return { deleted: true };
	}
};
