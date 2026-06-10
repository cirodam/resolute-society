<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Add New Member</h1>
		<p class="page-header-description">
			Create a new member account for {data.society.name}
		</p>
	</div>

	<div class="page-content">
		<div class="form-container card-border">
			<Alert type="error" message={form?.error} />

			<form method="POST" use:enhance class="person-form">
				<div class="form-group">
					<label for="handle">Handle *</label>
					<input
						id="handle"
						name="handle"
						type="text"
						required
						placeholder="username"
					/>
					<span class="field-hint">Unique identifier, no @ symbol needed</span>
				</div>

				<div class="form-group">
					<label for="given_name">Given Name *</label>
					<input
						id="given_name"
						name="given_name"
						type="text"
						required
						placeholder="John"
					/>
				</div>

				<div class="form-group">
					<label for="surname">Surname *</label>
					<input
						id="surname"
						name="surname"
						type="text"
						required
						placeholder="Smith"
					/>
				</div>

				<div class="form-group">
					<label for="password">Initial Password *</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						placeholder="••••••••"
					/>
					<span class="field-hint">Member will use this to log in initially</span>
				</div>

				<div class="form-group">
					<label for="membership_status">Membership Status</label>
					<select id="membership_status" name="membership_status">
						<option value="provisional">Provisional</option>
						<option value="full">Full</option>
					</select>
				</div>

				<div class="form-group">
					<label for="dob">Date of Birth</label>
					<input
						id="dob"
						name="dob"
						type="date"
					/>
				</div>

				<div class="form-group">
					<label for="sex">Sex</label>
					<select id="sex" name="sex">
						<option value="">Prefer not to say</option>
						<option value="male">Male</option>
						<option value="female">Female</option>
						<option value="other">Other</option>
					</select>
					<span class="field-hint">Optional — used for demographic and nutrition planning.</span>
				</div>

				<div class="form-group">
					<label for="location_id">Location</label>
					<select id="location_id" name="location_id">
						<option value="">— none —</option>
						{#each data.locations as loc}
							<option value={loc.id}>{loc.name}{loc.address ? ` · ${loc.address}` : ''}</option>
						{/each}
					</select>
					<span class="field-hint">Optional — link to a known society location.</span>
				</div>

				<div class="form-actions">
					<a href="/society/directory" class="btn">
						Cancel
					</a>
					<button type="submit" class="btn btn--primary">
						Create Member
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


	.person-form {
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
