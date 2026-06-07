<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<h1 class="t-display">Society Settings</h1>
		<p class="page-header-description">Manage {society.name} details</p>
	</div>

	{#if form?.success}
		<div class="success-message">Settings saved.</div>
	{/if}

	{#if form?.error}
		<div class="error-message">{form.error}</div>
	{/if}

	<div class="settings-card card-border">
		<form method="POST" action="?/updateSociety" use:enhance class="settings-form">
			<div class="form-section">
				<h2>Society</h2>

				<div class="form-group">
					<label for="id">ID</label>
					<input id="id" type="text" value={society.id} readonly />
				</div>

				<div class="form-group">
					<label for="name">Name</label>
					<input id="name" name="name" type="text" value={society.name} required />
				</div>

				<div class="form-group">
					<label for="handle">Handle</label>
					<input
						id="handle"
						name="handle"
						type="text"
						value={society.handle}
						required
						pattern="[a-z0-9-]+"
						title="Lowercase letters, numbers, and hyphens only"
					/>
					<span class="input-hint">Used in member addresses (e.g., name@{society.handle}). Lowercase letters, numbers, and hyphens only.</span>
				</div>

				<div class="form-group">
					<label for="address">Address</label>
					<input id="address" name="address" type="text" value={society.address || ''} />
					<span class="input-hint">Physical address or location description</span>
				</div>
			</div>

			<div class="form-section">
				<h2>Location</h2>
				<p class="section-note">Optional coordinates for mapping features.</p>

				<div class="form-row">
					<div class="form-group">
						<label for="lat">Latitude</label>
						<input
							id="lat"
							name="lat"
							type="number"
							step="0.000001"
							min="-90"
							max="90"
							value={society.lat || ''}
							placeholder="40.7128"
						/>
					</div>
					<div class="form-group">
						<label for="lng">Longitude</label>
						<input
							id="lng"
							name="lng"
							type="number"
							step="0.000001"
							min="-180"
							max="180"
							value={society.lng || ''}
							placeholder="-74.0060"
						/>
					</div>
				</div>
			</div>

			<div class="form-section">
				<h2>Federation</h2>
				<p class="section-note">Connection details for the federation network.</p>

				<div class="form-group">
					<label for="federation_url">Federation URL</label>
					<input
						id="federation_url"
						name="federation_url"
						type="url"
						value={society.federation_url || ''}
						placeholder="https://federation.example.org"
					/>
				</div>

				<div class="form-group">
					<label for="federation_ip_address">Federation IP Address</label>
					<input
						id="federation_ip_address"
						name="federation_ip_address"
						type="text"
						value={society.federation_ip_address || ''}
						placeholder="192.0.2.1"
					/>
				</div>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn--primary">Save Changes</button>
			</div>
		</form>
	</div>
</div>

<style>
	.settings-card {
		padding: var(--space-6);
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--border-subtle);
	}

	.form-section:last-of-type {
		border-bottom: none;
		padding-bottom: 0;
	}

	.form-section h2 {
		margin: 0;
	}

	.section-note {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: calc(var(--space-4) * -0.5) 0 0 0;
	}

	/* form-group gap differs (0.5rem vs global space-2=0.5rem — same) but keep for readonly override */
	.form-group {
		gap: 0.5rem;
	}

	.form-group input[readonly] {
		background: var(--tint-green-mid);
		color: var(--ink-mid);
		cursor: default;
		font-family: var(--font-mono) !important;
		font-size: var(--text-sm) !important;
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4);
	}

	.form-actions {
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-subtle);
	}
</style>
