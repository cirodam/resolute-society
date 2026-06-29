import { fail, redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.person) throw redirect(303, '/login');

	const repos = getRepositories();
	const [config, latest, observations] = await Promise.all([
		repos.creditPeg.getConfig(),
		repos.creditPeg.getLatestObservation(),
		repos.creditPeg.listObservations(20)
	]);

	return { config, latest, observations };
};

export const actions: Actions = {
	logObservation: async ({ request, locals }) => {
		if (!locals.person) throw redirect(303, '/login');

		const data = await request.formData();
		const observedOn = data.get('observed_on')?.toString().trim();
		const storeName = data.get('store_name')?.toString().trim() || null;
		const priceStr = data.get('price')?.toString().trim();

		if (!observedOn) return fail(400, { error: 'Date is required' });
		if (!priceStr) return fail(400, { error: 'Price is required' });

		const price = parseFloat(priceStr);
		if (isNaN(price) || price <= 0) return fail(400, { error: 'Price must be a positive number' });

		const priceCents = Math.round(price * 100);

		await getRepositories().creditPeg.addObservation({
			id: randomUUID(),
			observedOn,
			storeName,
			priceCents,
			recordedById: locals.person.id
		});

		return { success: true };
	},

	savePegConfig: async ({ request, locals }) => {
		if (!locals.person) throw redirect(303, '/login');

		const societyId = resolveSocietyId(undefined);
		const repos = getRepositories();

		const society = await repos.societies.findById(societyId);
		if (!society) return fail(404, { configError: 'Society not found' });

		const data = await request.formData();
		const itemName = data.get('item_name')?.toString().trim();
		const creditsStr = data.get('credits_per_item')?.toString().trim();

		if (!itemName) return fail(400, { configError: 'Item name is required' });
		if (!creditsStr) return fail(400, { configError: 'Credits per item is required' });

		const credits = parseFloat(creditsStr);
		if (isNaN(credits) || credits <= 0) return fail(400, { configError: 'Credits must be a positive number' });

		await repos.creditPeg.setConfig(itemName, credits);

		return { configSuccess: true };
	}
};
