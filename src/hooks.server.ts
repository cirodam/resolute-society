import { migrate } from '$lib/server/infra/schema';
import { getRepositories } from '$lib/server/infra/repositories';
import { enqueueFederationMessage, sweepFederationMessages } from '$lib/server/federation/client';
import { generateFederationKeypair } from '$lib/server/federation/crypto';
import { startScheduler } from '$lib/server/services/scheduler.service';
import type { Handle } from '@sveltejs/kit';

migrate();

(async () => {
	const repos = getRepositories();
	startScheduler();

	if (!repos.keypair.get()) {
		const kp = generateFederationKeypair();
		repos.keypair.create(kp.publicKey, kp.privateKey);
		console.log('[federation] generated society keypair');
	}

	const societies = repos.societies.listAll();
	if (societies.length > 0) {
		const personsWithoutKeypair = repos.people.listWithoutKeypair(societies[0].id);
		for (const person of personsWithoutKeypair) {
			const kp = generateFederationKeypair();
			repos.people.setKeypair(person.id, kp.publicKey, kp.privateKey);
		}
		if (personsWithoutKeypair.length > 0) {
			console.log(`[federation] generated keypairs for ${personsWithoutKeypair.length} existing members`);
		}
	}

	if (societies.length === 0) return;

	const society = societies[0];
	if (!repos.federationMessageQueue.isAdmitted(society.handle)) return;

	const memberCount = repos.people.countBySociety(society.id);
	enqueueFederationMessage('society_heartbeat', society.handle, {
		societyId: society.id,
		name: society.name,
		handle: society.handle,
		address: society.address,
		lat: society.lat,
		lng: society.lng,
		memberCount
	});
})();

let lastEventSweep = 0;

export const handle: Handle = async ({ event, resolve }) => {
	// If the app is not yet configured, redirect everything except /setup to the setup page.
	const isSetupRoute = event.url.pathname.startsWith('/setup');
	const isWelcomeRoute = event.url.pathname.startsWith('/welcome');
	const isLogoutRoute = event.url.pathname.startsWith('/logout');
	const isConfigured = getRepositories().societies.listAll().length > 0;

	if (!isConfigured && !isSetupRoute) {
		return new Response(null, { status: 302, headers: { location: '/setup' } });
	}

	if (isConfigured && isSetupRoute) {
		return new Response(null, { status: 302, headers: { location: '/login' } });
	}

	const sessionId = event.cookies.get('session');

	if (sessionId) {
		const person = getRepositories().people.findSessionPersonById(sessionId);

		if (person) {
			event.locals.person = {
				...person,
				name: `${person.given_name} ${person.surname}`
			};

			if (!person.welcome_seen_at && !isWelcomeRoute && !isLogoutRoute) {
				return new Response(null, { status: 302, headers: { location: '/welcome' } });
			}

			if (person.welcome_seen_at && isWelcomeRoute) {
				return new Response(null, { status: 302, headers: { location: '/society' } });
			}
		}
	}

	const now = Date.now();
	if (now - lastEventSweep > 30_000) {
		lastEventSweep = now;
		sweepFederationMessages().catch((err) =>
			console.warn('Federation message sweep failed:', (err as Error).message)
		);
	}

	return resolve(event);
};

