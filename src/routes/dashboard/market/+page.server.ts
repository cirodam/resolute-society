import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { randomUUID } from 'crypto';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { parsePage, pageOffset, totalPages } from '$lib/server/utils/pagination';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ url, locals }) => {
	const repositories = getRepositories();
	const societyId = resolveSocietyId(undefined);
	const society = await repositories.market.findSociety(societyId);

	if (!society) {
		throw error(404, 'Society not found');
	}

	const itemPage = parsePage(url, 'itemPage');
	const servicePage = parsePage(url, 'servicePage');

	const [itemListings, totalItems, serviceListings, totalServices, myItemListings, myServiceListings] =
		await Promise.all([
			repositories.market.listItemListings(societyId, PAGE_SIZE, pageOffset(itemPage, PAGE_SIZE)),
			repositories.market.countItemListings(societyId),
			repositories.market.listServiceListings(societyId, PAGE_SIZE, pageOffset(servicePage, PAGE_SIZE)),
			repositories.market.countServiceListings(societyId),
			locals.person
				? repositories.market.listItemListingsByPerson(societyId, locals.person.id)
				: Promise.resolve([]),
			locals.person
				? repositories.market.listServiceListingsByPerson(societyId, locals.person.id)
				: Promise.resolve([])
		]);

	return {
		society,
		itemListings,
		itemPage,
		itemTotalPages: totalPages(totalItems, PAGE_SIZE),
		serviceListings,
		servicePage,
		serviceTotalPages: totalPages(totalServices, PAGE_SIZE),
		myItemListings,
		myServiceListings
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

		const listingId = randomUUID();
		const societyId = resolveSocietyId(undefined);
		await getRepositories().market.createItemListing({
			listingId,
			societyId,
			personId: locals.person.id,
			type,
			category,
			title,
			description,
			societyCreditsPrice: societyPrice,
			federationCreditsPrice: federationPrice
		});

		await audit({
			actor: locals.person,
			societyId,
			eventType: 'MARKET_ITEM_LISTED',
			targetType: 'item_listing',
			targetId: listingId,
			summary: `Item listing "${title}" created (${type})`,
			metadata: { title, type, category }
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

		const listingId = randomUUID();
		const societyId = resolveSocietyId(undefined);
		await getRepositories().market.createServiceListing({
			listingId,
			societyId,
			personId: locals.person.id,
			category,
			title,
			description,
			societyCreditsRate: societyRate,
			federationCreditsRate: federationRate,
			rateUnit
		});

		await audit({
			actor: locals.person,
			societyId,
			eventType: 'MARKET_SERVICE_LISTED',
			targetType: 'service_listing',
			targetId: listingId,
			summary: `Service listing "${title}" created`,
			metadata: { title, category, rateUnit }
		});

		return { success: true };
	}
} satisfies Actions;
