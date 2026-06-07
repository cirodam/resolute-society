import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repositories = getRepositories();
	const society = repositories.market.findSociety(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	return {
		society,
		itemListings: repositories.market.listItemListings(resolveSocietyId(undefined)),
		serviceListings: repositories.market.listServiceListings(resolveSocietyId(undefined))
	};
};

export const actions: Actions = {
	createItem: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { message: 'Not authenticated' });
		}

		const formData = await request.formData();
		const type = formData.get('type') as 'offer' | 'wanted';
		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const category = formData.get('category')?.toString() || null;
		const societyPriceStr = formData.get('society_credits_price')?.toString();
		const federationPriceStr = formData.get('federation_credits_price')?.toString();

		if (!title || !description) {
			return fail(400, { message: 'Title and description required' });
		}

		const societyPrice = societyPriceStr ? parseFloat(societyPriceStr) : null;
		const federationPrice = federationPriceStr ? parseFloat(federationPriceStr) : null;

		if (federationPrice !== null && societyPrice === null) {
			return fail(400, { message: 'Society credits price required when federation credits price is set' });
		}

		getRepositories().market.createItemListing({
			listingId: randomUUID(),
			societyId: resolveSocietyId(undefined),
			personId: locals.person.id,
			type,
			category,
			title,
			description,
			societyCreditsPrice: societyPrice,
			federationCreditsPrice: federationPrice
		});

		return { success: true };
	},

	createService: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { message: 'Not authenticated' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const category = formData.get('category')?.toString() || null;
		const societyRateStr = formData.get('society_credits_rate')?.toString();
		const federationRateStr = formData.get('federation_credits_rate')?.toString();
		const rateUnit = formData.get('rate_unit')?.toString() || null;

		if (!title || !description) {
			return fail(400, { message: 'Title and description required' });
		}

		const societyRate = societyRateStr ? parseFloat(societyRateStr) : null;
		const federationRate = federationRateStr ? parseFloat(federationRateStr) : null;

		if (federationRate !== null && societyRate === null) {
			return fail(400, { message: 'Society credits rate required when federation credits rate is set' });
		}

		getRepositories().market.createServiceListing({
			listingId: randomUUID(),
			societyId: resolveSocietyId(undefined),
			personId: locals.person.id,
			category,
			title,
			description,
			societyCreditsRate: societyRate,
			federationCreditsRate: federationRate,
			rateUnit
		});

		return { success: true };
	}
} satisfies Actions;
