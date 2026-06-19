import { error, fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
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
	createCategory: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const color = data.get('color')?.toString() || '#7a5c1a';
		if (!name) return fail(400, { categoryError: 'Name is required' });
		const id = randomUUID();
		const societyId = resolveSocietyId(undefined);
		await getRepositories().locationCategories.create({ id, societyId, name, color });
		await audit({ actor: locals.person, societyId, eventType: 'LOCATION_CATEGORY_CREATED', targetType: 'location_category', targetId: id, summary: `Location category "${name}" created`, metadata: { name, color } });
		return { categoryCreated: true };
	},

	updateCategory: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		const name = data.get('name')?.toString().trim();
		const color = data.get('color')?.toString() || '#7a5c1a';
		if (!id || !name) return fail(400, { categoryError: 'Invalid request' });
		await getRepositories().locationCategories.update({ id, name, color });
		await audit({ actor: locals.person, societyId: resolveSocietyId(undefined), eventType: 'LOCATION_CATEGORY_UPDATED', targetType: 'location_category', targetId: id, summary: `Location category updated`, metadata: { name, color } });
		return { categoryUpdated: true };
	},

	deleteCategory: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { categoryError: 'ID required' });
		await getRepositories().locationCategories.delete(id);
		await audit({ actor: locals.person, societyId: resolveSocietyId(undefined), eventType: 'LOCATION_CATEGORY_DELETED', targetType: 'location_category', targetId: id, summary: `Location category deleted` });
		return { categoryDeleted: true };
	},

	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const categoryId = data.get('category_id')?.toString() || null;
		const address = data.get('address')?.toString().trim() || null;
		const lat = parseFloat(data.get('lat')?.toString() || '');
		const lng = parseFloat(data.get('lng')?.toString() || '');
		const notes = data.get('notes')?.toString().trim() || null;

		if (!name) return fail(400, { createError: 'Name is required' });
		if (isNaN(lat) || isNaN(lng)) return fail(400, { createError: 'Valid coordinates are required' });

		const id = randomUUID();
		const societyId = resolveSocietyId(undefined);
		await getRepositories().locations.create({ id, societyId, name, categoryId, address, lat, lng, notes });
		await audit({ actor: locals.person, societyId, eventType: 'LOCATION_CREATED', targetType: 'location', targetId: id, summary: `Location "${name}" created`, metadata: { name, address, lat, lng } });
		return { created: true };
	},

	update: async ({ request, locals }) => {
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
		await audit({ actor: locals.person, societyId: resolveSocietyId(undefined), eventType: 'LOCATION_UPDATED', targetType: 'location', targetId: id, summary: `Location "${name}" updated`, metadata: { name, address, lat, lng } });
		return { updated: true };
	},

	delete: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id')?.toString();
		if (!id) return fail(400, { deleteError: 'ID is required' });
		await getRepositories().locations.delete(id);
		await audit({ actor: locals.person, societyId: resolveSocietyId(undefined), eventType: 'LOCATION_DELETED', targetType: 'location', targetId: id, summary: `Location deleted` });
		return { deleted: true };
	}
};
