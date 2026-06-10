import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveLocalEntity, resolveLocalEntityById } from './local-entity.util';
import type { Repositories } from '$lib/server/infra/repositories';

const SOCIETY_ID = 'soc-1';

function makeRepos(overrides: {
	personByHandle?: { id: string } | null;
	personById?: { id: string; society_id: string } | null;
	assocByHandle?: { id: string; name: string } | null;
	assocById?: { id: string; society_id: string } | null;
}): Repositories {
	return {
		people: {
			findByHandleAndSociety: async () => overrides.personByHandle ?? null,
			findProfileById: async () => overrides.personById ?? null,
		},
		associations: {
			findByHandleAndSociety: async () => overrides.assocByHandle ?? null,
			findById: async () => overrides.assocById ?? null,
		}
	} as unknown as Repositories;
}

// ---------------------------------------------------------------------------
// resolveLocalEntity (handle-based)
// ---------------------------------------------------------------------------

describe('resolveLocalEntity', () => {
	it('resolves treasury keyword to society type', async () => {
		const repos = makeRepos({});
		const result = await resolveLocalEntity('treasury', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'society', id: SOCIETY_ID });
	});

	it('resolves a known person handle', async () => {
		const repos = makeRepos({ personByHandle: { id: 'person-1' } });
		const result = await resolveLocalEntity('alice', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'person', id: 'person-1' });
	});

	it('resolves a known association handle when person not found', async () => {
		const repos = makeRepos({
			personByHandle: null,
			assocByHandle: { id: 'assoc-1', name: 'Woodworkers' }
		});
		const result = await resolveLocalEntity('woodworkers', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'association', id: 'assoc-1' });
	});

	it('prefers person over association when both match the same handle', async () => {
		const repos = makeRepos({
			personByHandle: { id: 'person-1' },
			assocByHandle: { id: 'assoc-1', name: 'Same Handle Association' }
		});
		const result = await resolveLocalEntity('shared', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'person', id: 'person-1' });
	});

	it('returns null for an unknown handle', async () => {
		const repos = makeRepos({ personByHandle: null, assocByHandle: null });
		const result = await resolveLocalEntity('nobody', SOCIETY_ID, repos);
		assert.equal(result, null);
	});
});

// ---------------------------------------------------------------------------
// resolveLocalEntityById (id-based)
// ---------------------------------------------------------------------------

describe('resolveLocalEntityById', () => {
	it('resolves treasury keyword to society type', async () => {
		const repos = makeRepos({});
		const result = await resolveLocalEntityById('treasury', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'society', id: SOCIETY_ID });
	});

	it('resolves a known person in the correct society', async () => {
		const repos = makeRepos({ personById: { id: 'person-1', society_id: SOCIETY_ID } });
		const result = await resolveLocalEntityById('person-1', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'person', id: 'person-1' });
	});

	it('rejects a person from a different society', async () => {
		const repos = makeRepos({ personById: { id: 'person-1', society_id: 'other-soc' } });
		const result = await resolveLocalEntityById('person-1', SOCIETY_ID, repos);
		assert.equal(result, null);
	});

	it('resolves a known association in the correct society', async () => {
		const repos = makeRepos({
			personById: null,
			assocById: { id: 'assoc-1', society_id: SOCIETY_ID }
		});
		const result = await resolveLocalEntityById('assoc-1', SOCIETY_ID, repos);
		assert.deepEqual(result, { type: 'association', id: 'assoc-1' });
	});

	it('rejects an association from a different society', async () => {
		const repos = makeRepos({
			personById: null,
			assocById: { id: 'assoc-1', society_id: 'other-soc' }
		});
		const result = await resolveLocalEntityById('assoc-1', SOCIETY_ID, repos);
		assert.equal(result, null);
	});

	it('returns null for an unknown id', async () => {
		const repos = makeRepos({ personById: null, assocById: null });
		const result = await resolveLocalEntityById('unknown', SOCIETY_ID, repos);
		assert.equal(result, null);
	});
});
