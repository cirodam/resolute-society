import { fail } from '@sveltejs/kit';
import {
	createBackup,
	listBackups,
	formatBytes,
	BACKUP_DIR_DEFAULT,
	BACKUP_KEEP_DEFAULT,
	PG_DUMP_BIN_DEFAULT,
	PG_RESTORE_BIN_DEFAULT
} from '$lib/server/backup/backup.service';
import { getConfig, setConfig } from '$lib/server/infra/config';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [backups, backupDir, backupKeep, pgDumpBin, pgRestoreBin] = await Promise.all([
		listBackups(),
		getConfig('backup_dir', BACKUP_DIR_DEFAULT),
		getConfig('backup_keep', BACKUP_KEEP_DEFAULT),
		getConfig('pg_dump_bin', PG_DUMP_BIN_DEFAULT),
		getConfig('pg_restore_bin', PG_RESTORE_BIN_DEFAULT)
	]);
	return {
		backups: backups.map((b) => ({
			filename: b.filename,
			createdAt: b.createdAt.toISOString(),
			sizeBytes: b.sizeBytes,
			sizeLabel: formatBytes(b.sizeBytes)
		})),
		backupDir,
		backupKeep,
		pgDumpBin,
		pgRestoreBin
	};
};

export const actions: Actions = {
	createBackup: async () => {
		try {
			const backup = await createBackup();
			return { success: true, filename: backup.filename, sizeLabel: formatBytes(backup.sizeBytes) };
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			console.error('[backup] manual backup failed:', message);
			return fail(500, { error: `Backup failed: ${message}` });
		}
	},

	saveSettings: async ({ request }) => {
		const data = await request.formData();
		const dir = (data.get('backup_dir') as string | null)?.trim();
		const keep = (data.get('backup_keep') as string | null)?.trim();
		const pgDump = (data.get('pg_dump_bin') as string | null)?.trim() || PG_DUMP_BIN_DEFAULT;
		const pgRestore = (data.get('pg_restore_bin') as string | null)?.trim() || PG_RESTORE_BIN_DEFAULT;

		if (!dir) return fail(400, { settingsError: 'Backup directory is required.' });
		const keepNum = parseInt(keep ?? '', 10);
		if (!keep || isNaN(keepNum) || keepNum < 1 || keepNum > 100) {
			return fail(400, { settingsError: 'Files to keep must be a number between 1 and 100.' });
		}

		await Promise.all([
			setConfig('backup_dir', dir),
			setConfig('backup_keep', String(keepNum)),
			setConfig('pg_dump_bin', pgDump),
			setConfig('pg_restore_bin', pgRestore)
		]);
		return { settingsSaved: true };
	}
};
