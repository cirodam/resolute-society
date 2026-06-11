<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	let backing = $state(false);
	let savingSettings = $state(false);
	let backupDir = $state(data.backupDir);
	let backupKeep = $state(data.backupKeep);
	let pgDumpBin = $state(data.pgDumpBin);
	let pgRestoreBin = $state(data.pgRestoreBin);
</script>

<div class="page-content">
	<div class="section-header">
		<h2 class="section-title">Backups</h2>
		<form
			method="POST"
			action="?/createBackup"
			use:enhance={() => {
				backing = true;
				return async ({ update }) => {
					await update();
					backing = false;
				};
			}}
		>
			<button type="submit" class="btn btn--secondary btn--small" disabled={backing}>
				{backing ? 'Backing up…' : 'Back Up Now'}
			</button>
		</form>
	</div>

	<Alert type="success" message={form?.success ? `Backup created: ${form.filename} (${form.sizeLabel})` : null} />
	<Alert type="success" message={form?.settingsSaved ? 'Settings saved.' : null} />
	<Alert type="error" message={form?.error ?? form?.settingsError ?? null} />

	<div class="backup-settings card-border">
		<form
			method="POST"
			action="?/saveSettings"
			use:enhance={() => {
				savingSettings = true;
				return async ({ update }) => {
					await update();
					savingSettings = false;
				};
			}}
		>
			<div class="settings-row">
				<label class="settings-label" for="backup_dir">Backup directory</label>
				<input
					id="backup_dir"
					name="backup_dir"
					type="text"
					class="input"
					bind:value={backupDir}
					placeholder="./backups"
				/>
			</div>
			<div class="settings-row">
				<label class="settings-label" for="backup_keep">Files to keep</label>
				<input
					id="backup_keep"
					name="backup_keep"
					type="number"
					min="1"
					max="100"
					class="input input--narrow"
					bind:value={backupKeep}
				/>
			</div>
			<div class="settings-row">
				<label class="settings-label" for="pg_dump_bin">pg_dump path</label>
				<input
					id="pg_dump_bin"
					name="pg_dump_bin"
					type="text"
					class="input"
					bind:value={pgDumpBin}
					placeholder="pg_dump"
				/>
			</div>
			<div class="settings-row">
				<label class="settings-label" for="pg_restore_bin">pg_restore path</label>
				<input
					id="pg_restore_bin"
					name="pg_restore_bin"
					type="text"
					class="input"
					bind:value={pgRestoreBin}
					placeholder="pg_restore"
				/>
			</div>
			<div class="settings-actions">
				<button type="submit" class="btn btn--secondary btn--small" disabled={savingSettings}>
					{savingSettings ? 'Saving…' : 'Save settings'}
				</button>
			</div>
		</form>
	</div>

	<div class="backup-info card-border">
		<p class="backup-description">
			Backups are created automatically once per day and kept for up to 10 files. Download a backup
			file and store it somewhere safe — on a USB drive, a separate computer, or any offline location.
			If you ever need to restore, install the app fresh and use the backup file on the setup screen.
		</p>
	</div>

	{#if data.backups.length === 0}
		<EmptyState message="No backups yet. Click 'Back Up Now' to create the first one." />
	{:else}
		<div class="backup-table card-border">
			<div class="backup-header">
				<div>Date</div>
				<div>File</div>
				<div>Size</div>
				<div></div>
			</div>
			{#each data.backups as backup}
				<div class="backup-row">
					<div class="backup-cell backup-cell--date">{formatDate(backup.createdAt)}</div>
					<div class="backup-cell backup-cell--filename">{backup.filename}</div>
					<div class="backup-cell backup-cell--size">{backup.sizeLabel}</div>
					<div class="backup-cell backup-cell--action">
						<a
							href="/society/settings/backup/{backup.filename}"
							download={backup.filename}
							class="btn btn--secondary btn--small"
						>
							Download
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.backup-settings {
		padding: var(--space-4) var(--space-5);
		margin-bottom: var(--space-5);
	}

	.settings-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}

	.settings-label {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		width: 10rem;
		flex-shrink: 0;
	}

	.input--narrow {
		width: 6rem;
	}

	.settings-actions {
		margin-top: var(--space-4);
		display: flex;
		justify-content: flex-end;
	}

	.backup-info {
		padding: var(--space-4) var(--space-5);
		margin-bottom: var(--space-6);
	}

	.backup-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
		line-height: 1.6;
	}

	.backup-table {
		overflow: hidden;
	}

	.backup-header {
		display: grid;
		grid-template-columns: 12rem 1fr 6rem 7rem;
		padding: var(--space-2) var(--space-4);
		background: var(--tint-green-mid);
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-mid);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.backup-row {
		display: grid;
		grid-template-columns: 12rem 1fr 6rem 7rem;
		align-items: center;
		border-bottom: 1px solid var(--border-faint);
	}

	.backup-row:last-child {
		border-bottom: none;
	}

	.backup-row:hover {
		background: var(--tint-gold);
	}

	.backup-cell {
		padding: var(--space-3) var(--space-4);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.backup-cell--date {
		color: var(--ink-mid);
		white-space: nowrap;
	}

	.backup-cell--filename {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--ink-base);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.backup-cell--size {
		color: var(--ink-mid);
	}

	.backup-cell--action {
		text-align: right;
	}
</style>
