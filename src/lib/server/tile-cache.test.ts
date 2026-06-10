import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { warmTileBatch } from './tile-cache';

describe('warmTileBatch', () => {
	it('aggregates cached, fetched, and failed counts under bounded concurrency', async () => {
		const tiles: Array<[number, number, number]> = [
			[10, 1, 1],
			[10, 1, 2],
			[10, 1, 3],
			[10, 1, 4],
			[10, 1, 5]
		];

		const cachedSet = new Set(['10/1/1', '10/1/2']);
		const fetchedSet = new Set(['10/1/3', '10/1/5']);
		const progress: number[] = [];

		const result = await warmTileBatch({
			tiles,
			concurrency: 2,
			onProgress: (done) => progress.push(done),
			getCachedTileImpl: async (z, x, y) => {
				const key = `${z}/${x}/${y}`;
				return cachedSet.has(key) ? Buffer.from([1]) : null;
			},
			fetchAndCacheTileImpl: async (z, x, y) => {
				const key = `${z}/${x}/${y}`;
				return fetchedSet.has(key) ? Buffer.from([2]) : null;
			}
		});

		assert.deepEqual(result, {
			fetched: 2,
			alreadyCached: 2,
			failed: 1
		});
		assert.equal(progress.length, tiles.length);
		assert.equal(progress[progress.length - 1], tiles.length);
	});

	it('counts thrown fetch errors as failed and still completes batch', async () => {
		const tiles: Array<[number, number, number]> = [
			[11, 2, 1],
			[11, 2, 2],
			[11, 2, 3]
		];

		let fetchCalls = 0;
		const result = await warmTileBatch({
			tiles,
			concurrency: 3,
			getCachedTileImpl: async () => null,
			fetchAndCacheTileImpl: async (_z, _x, y) => {
				fetchCalls += 1;
				if (y === '2') {
					throw new Error('simulated timeout');
				}
				return Buffer.from([9]);
			}
		});

		assert.equal(fetchCalls, 3);
		assert.deepEqual(result, {
			fetched: 2,
			alreadyCached: 0,
			failed: 1
		});
	});
});
