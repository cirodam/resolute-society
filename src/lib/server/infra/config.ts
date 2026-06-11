import { db } from './db';

export async function getConfig(key: string, defaultValue: string): Promise<string> {
	const rows = await db()`SELECT value FROM society_config WHERE key = ${key}`;
	return rows[0]?.value ?? defaultValue;
}

export async function setConfig(key: string, value: string): Promise<void> {
	await db()`
		INSERT INTO society_config (key, value)
		VALUES (${key}, ${value})
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`;
}
