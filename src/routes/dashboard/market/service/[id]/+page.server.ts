import { error, fail, redirect } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repos = getRepositories();
	const [listing, pegConfig, pegLatest] = await Promise.all([
		repos.market.findServiceListing(params.id),
		repos.creditPeg.getConfig(),
		repos.creditPeg.getLatestObservation()
	]);
	if (!listing) throw error(404, 'Listing not found');
	const dollarPerCredit =
		pegConfig.creditsPerItem && pegLatest
			? (pegLatest.price_cents / 100) / pegConfig.creditsPerItem
			: null;
	return { listing, isOwner: locals.person?.id === listing.person_id, dollarPerCredit };
};

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		if (!locals.person) return fail(401, { updateError: 'Not authenticated' });

		const listing = await getRepositories().market.findServiceListing(params.id);
		if (!listing) return fail(404, { updateError: 'Listing not found' });
		if (listing.person_id !== locals.person.id) return fail(403, { updateError: 'Not your listing' });
		if (listing.status !== 'active') return fail(400, { updateError: 'Listing is no longer active' });

		const formData = await request.formData();
		const title = formData.get('title')?.toString()?.trim();
		const description = formData.get('description')?.toString()?.trim();
		const category = formData.get('category')?.toString() || null;
		const societyRate = formData.get('society_credits_rate')?.toString();
		const federationRate = formData.get('federation_credits_rate')?.toString();
		const rateUnit = formData.get('rate_unit')?.toString() || null;
		const dollarsAllowed = formData.get('dollars_allowed') === 'on';

		if (!title || !description) return fail(400, { updateError: 'Title and description required' });

		const societyCreditsRate = societyRate ? parseFloat(societyRate) : null;
		const federationCreditsRate = federationRate ? parseFloat(federationRate) : null;

		if (federationCreditsRate !== null && societyCreditsRate === null) {
			return fail(400, { updateError: 'Society credits rate required when federation credits rate is set' });
		}

		await getRepositories().market.updateServiceListing(params.id, {
			category, title, description, societyCreditsRate, federationCreditsRate, dollarsAllowed, rateUnit
		});

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'MARKET_SERVICE_UPDATED',
			targetType: 'service_listing',
			targetId: params.id,
			summary: `Service listing "${title}" updated`,
			metadata: { title, category }
		});

		return { updateSuccess: true };
	},

	deactivate: async ({ params, locals }) => {
		if (!locals.person) return fail(401, { deactivateError: 'Not authenticated' });

		const listing = await getRepositories().market.findServiceListing(params.id);
		if (!listing) return fail(404, { deactivateError: 'Listing not found' });
		if (listing.person_id !== locals.person.id) return fail(403, { deactivateError: 'Not your listing' });

		await getRepositories().market.deactivateServiceListing(params.id);

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'MARKET_SERVICE_CLOSED',
			targetType: 'service_listing',
			targetId: params.id,
			summary: `Service listing "${listing.title}" deactivated`,
			metadata: {}
		});

		redirect(303, '/dashboard/market');
	}
};
