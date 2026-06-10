<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Create Association</h1>
		<p class="page-header-description">
			Add a new association to {data.society.name}
		</p>
	</div>

	<div class="page-content">
		<div class="form-container card-border">
			{#if form?.error}
				<div class="error-message">{form.error}</div>
			{/if}

			<form method="POST" use:enhance class="association-form">
				<div class="form-group">
					<label for="handle">Handle *</label>
					<input
						id="handle"
						name="handle"
						type="text"
						required
						placeholder="woodworkers"
					/>
					<span class="field-hint">Unique identifier, no spaces</span>
				</div>

				<div class="form-group">
					<label for="name">Association Name *</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						placeholder="Woodworkers Guild"
					/>
				</div>

				<div class="form-group">
					<label for="type">Type</label>
					<input
						id="type"
						name="type"
						type="text"
						placeholder="e.g., Trade Guild, Committee"
					/>
					<span class="field-hint">Optional category or classification</span>
				</div>

				<div class="form-group">
					<label for="special_type">Special Type</label>
					<select id="special_type" name="special_type" class="input">
						<option value="none">None</option>
						<option value="college">College</option>
						<option value="hub">Hub</option>
					</select>
					<span class="field-hint">Colleges appear in member profiles. Hubs are physical locations.</span>
				</div>

				<div class="form-group">
					<label for="location_id">Location</label>
					<select id="location_id" name="location_id">
						<option value="">— none —</option>
						{#each data.locations as loc}
							<option value={loc.id}>{loc.name}{loc.address ? ` · ${loc.address}` : ''}</option>
						{/each}
					</select>
					<span class="field-hint">Link to a defined society location — required for hubs to appear on the map.</span>
				</div>

				<div class="form-group">
					<label for="founder_handle">Founding Member Handle *</label>
					<input
						id="founder_handle"
						name="founder_handle"
						type="text"
						required
						placeholder="memberhandle"
					/>
					<span class="field-hint">This person will be added as the first member of the association.</span>
				</div>

				<div class="form-actions">
					<a href="/society/directory" class="btn">
						Cancel
					</a>
					<button type="submit" class="btn btn--primary">
						Create Association
					</button>
				</div>
			</form>
		</div>
	</div>
</div>

<style>
	.page-container {
		max-width: 700px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.form-container {
		padding: var(--space-6);
	}

	/* error-message has margin-bottom: space-5 here (vs global space-4) */
	.error-message {
		margin-bottom: var(--space-5);
	}

	.association-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}


	.field-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.form-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-subtle);
	}
</style>
