<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';

	let { form }: { form: ActionData } = $props();
</script>

<div class="setup-container">
	<div class="setup-card card-border">
		<div class="setup-header">
			<h1 class="t-display">Restore from Backup</h1>
			<p class="setup-description">
				Upload a backup file to restore your society. All data will be replaced with the contents of
				the backup.
			</p>
		</div>

		<Alert type="error" message={form?.error} />

		<form method="POST" enctype="multipart/form-data" use:enhance class="restore-form">
			<div class="form-group">
				<label for="backup">Backup file</label>
				<input id="backup" name="backup" type="file" accept=".dump" required class="file-input" />
				<span class="input-hint">Select a .dump file previously downloaded from the backup page.</span>
			</div>

			<div class="warning-box">
				<p class="warning-text">
					This will permanently overwrite all current data. Make sure you have selected the correct
					file before continuing.
				</p>
			</div>

			<ConfirmButton class="btn btn--primary restore-submit" confirmLabel="Yes, restore — are you sure?">
				Restore Society
			</ConfirmButton>
		</form>

		<div class="alt-link">
			<a href="/setup">← Set up a new society instead</a>
		</div>
	</div>
</div>

<style>
	.setup-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-6);
	}

	.setup-card {
		width: 100%;
		max-width: 540px;
		padding: var(--space-8);
	}

	.setup-header {
		margin-bottom: var(--space-6);
		text-align: center;
	}

	.setup-header h1 {
		margin: 0 0 var(--space-2) 0;
	}

	.setup-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.restore-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.file-input {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.warning-box {
		padding: var(--space-4);
		background: var(--tint-danger, #fff3f3);
		border: 1px solid var(--danger);
	}

	.warning-text {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--danger);
		margin: 0;
	}

	.restore-submit {
		width: 100%;
	}

	.alt-link {
		margin-top: var(--space-6);
		text-align: center;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}
</style>
