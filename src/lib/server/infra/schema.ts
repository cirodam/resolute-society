import { db } from './db';
import { CORE_SCHEMA } from './schema/core';
import { FEDERATION_SCHEMA } from './schema/federation';
import { INFRASTRUCTURE_SCHEMA } from './schema/infrastructure';
import { LEDGER_SCHEMA } from './schema/ledger';
import { NUTRITION_SCHEMA } from './schema/nutrition';

const SCHEMA = [CORE_SCHEMA, FEDERATION_SCHEMA, NUTRITION_SCHEMA, LEDGER_SCHEMA, INFRASTRUCTURE_SCHEMA].join('\n\n');

export async function migrate(): Promise<void> {
	await db().unsafe(SCHEMA);
}
