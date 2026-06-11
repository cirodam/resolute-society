import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { getConfig } from '$lib/server/infra/config';

const execFileAsync = promisify(execFile);

export const BACKUP_DIR_DEFAULT = './backups';
export const BACKUP_KEEP_DEFAULT = '10';

async function backupDir(): Promise<string> {
	return getConfig('backup_dir', BACKUP_DIR_DEFAULT);
}

async function keepBackups(): Promise<number> {
	return parseInt(await getConfig('backup_keep', BACKUP_KEEP_DEFAULT), 10);
}

export type BackupEntry = {
	filename: string;
	path: string;
	createdAt: Date;
	sizeBytes: number;
};

function parseDbUrl() {
	const raw = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/resolute_society';
	const url = new URL(raw);
	return {
		host: url.hostname,
		port: url.port || '5432',
		user: url.username,
		password: url.password,
		database: url.pathname.slice(1)
	};
}

function pgEnv(): NodeJS.ProcessEnv {
	return { ...process.env, PGPASSWORD: parseDbUrl().password };
}

export async function createBackup(): Promise<BackupEntry> {
	const dir = await backupDir();
	await mkdir(dir, { recursive: true });

	const now = new Date();
	const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
	const filename = `backup-${timestamp}.dump`;
	const filePath = join(dir, filename);

	const { host, port, user, database } = parseDbUrl();

	await execFileAsync(
		'pg_dump',
		['--format=custom', '--compress=6', `--file=${filePath}`, '-h', host, '-p', port, '-U', user, database],
		{ env: pgEnv() }
	);

	const info = await stat(filePath);
	await pruneOldBackups();

	return { filename, path: filePath, createdAt: now, sizeBytes: info.size };
}

export async function listBackups(): Promise<BackupEntry[]> {
	try {
		const dir = await backupDir();
		await mkdir(dir, { recursive: true });
		const files = await readdir(dir);

		const entries = await Promise.all(
			files
				.filter((f) => f.match(/^backup-[\d-T]+\.dump$/))
				.map(async (filename) => {
					const filePath = join(dir, filename);
					const info = await stat(filePath);
					return { filename, path: filePath, createdAt: info.mtime, sizeBytes: info.size };
				})
		);

		return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	} catch {
		return [];
	}
}

export async function pruneOldBackups(): Promise<void> {
	const backups = await listBackups();
	const keep = await keepBackups();
	const toDelete = backups.slice(keep);
	await Promise.all(toDelete.map((b) => unlink(b.path).catch(() => {})));
}

export async function restoreFromUpload(buffer: Buffer): Promise<void> {
	const tempPath = join(tmpdir(), `resolute-restore-${Date.now()}.dump`);
	try {
		await writeFile(tempPath, buffer);
		await restoreFromFile(tempPath);
	} finally {
		await unlink(tempPath).catch(() => {});
	}
}

async function restoreFromFile(filePath: string): Promise<void> {
	const { host, port, user, database } = parseDbUrl();

	await execFileAsync(
		'pg_restore',
		['--clean', '--if-exists', '--no-owner', '--no-acl', '-h', host, '-p', port, '-U', user, '-d', database, filePath],
		{ env: pgEnv() }
	);
}

export async function streamBackup(filename: string): Promise<ReadableStream> {
	if (!filename.match(/^backup-[\d-T]+\.dump$/)) {
		throw new Error('Invalid backup filename');
	}
	const dir = await backupDir();
	const filePath = join(dir, filename);
	return Readable.toWeb(createReadStream(filePath)) as ReadableStream;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
