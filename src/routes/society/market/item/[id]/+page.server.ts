import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const listing = await getRepositories().market.findItemListing(params.id);
	if (!listing) throw error(404, 'Listing not found');
	return { listing, isOwner: locals.person?.id === listing.person_id };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.person) return fail(401, { updateError: 'Not authenticated' });

		const listing = await getRepositories().market.findItemListing(params.id);
		if (!listing) return fail(404, { updateError: 'Listing not found' });
		if (listing.person_id !== locals.person.id) return fail(403, { updateError: 'Not your listing' });
		if (listing.status !== 'active') return fail(400, { updateError: 'Listing is no longer active' });

		const formData = await request.formData();
		const title = formData.get('title')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim();
		const category = formData.get('category')?.toString() || null;
		const societyPrice = formData.get('society_credits_price')?.toString();
		const federationPrice = formData.get('federation_credits_price')?.toString();

		if (!title || !description) return fail(400, { updateError: 'Title and description required' });

		const societyCreditsPrice = societyPrice ? parseFloat(societyPrice) : null;
		const federationCreditsPrice = federationPrice ? parseFloat(federationPrice) : null;

		if (federationCreditsPrice !== null && societyCreditsPrice === null) {
			return fail(400, { updateError: 'Society credits price required when federation credits price is set' });
		}

		await getRepositories().market.updateItemListing(params.id, {
			category, title, description, societyCreditsPrice, federationCreditsPrice
		});

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'MARKET_ITEM_UPDATED',
			targetType: 'item_listing',
			targetId: params.id,
			summary: `Item listing "${title}" updated`,
			metadata: { title, category }
		});

		return { updateSuccess: true };
	},

	markSold: async ({ params, locals }) => {
		if (!locals.person) return fail(401, { closeError: 'Not authenticated' });

		const listing = await getRepositories().market.findItemListing(params.id);
		if (!listing) return fail(404, { closeError: 'Listing not found' });
		if (listing.person_id !== locals.person.id) return fail(403, { closeError: 'Not your listing' });

		await getRepositories().market.closeItemListing(params.id, 'sold');

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'MARKET_ITEM_CLOSED',
			targetType: 'item_listing',
			targetId: params.id,
			summary: `Item listing "${listing.title}" marked as sold`,
			metadata: { status: 'sold' }
		});

		redirect(303, '/society/market');
	},

	close: async ({ params, locals }) => {
		if (!locals.person) return fail(401, { closeError: 'Not authenticated' });

		const listing = await getRepositories().market.findItemListing(params.id);
		if (!listing) return fail(404, { closeError: 'Listing not found' });
		if (listing.person_id !== locals.person.id) return fail(403, { closeError: 'Not your listing' });

		await getRepositories().market.closeItemListing(params.id, 'closed');

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'MARKET_ITEM_CLOSED',
			targetType: 'item_listing',
			targetId: params.id,
			summary: `Item listing "${listing.title}" closed`,
			metadata: { status: 'closed' }
		});

		redirect(303, '/society/market');
	}
};
