<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';

	let { form }: { form: ActionData } = $props();
</script>

<div class="setup-container">
	<div class="setup-card card-border">
		<div class="setup-header">
			<h1 class="t-display">Welcome</h1>
			<p class="t-prose text-secondary">
				Set up your society and create the first account to get started.
			</p>
		</div>

		<Alert type="error" message={form?.error} />

		<form method="POST" use:enhance class="setup-form">
			<fieldset>
				<legend class="fieldset-legend t-label">Society</legend>

				<div class="form-group">
					<label for="society_name">Name</label>
					<input
						id="society_name"
						name="society_name"
						type="text"
						required
						placeholder="West Philadelphia Mutual Aid Society"
					/>
				</div>

				<div class="form-group">
					<label for="society_handle">Handle</label>
					<input
						id="society_handle"
						name="society_handle"
						type="text"
						required
						placeholder="west-philly-mas"
						pattern="[a-z0-9-]+"
						title="Lowercase letters, numbers, and hyphens only"
					/>
					<span class="input-hint">Lowercase letters, numbers, and hyphens only</span>
				</div>

				<div class="form-group">
					<label for="society_address">Address <span class="optional">(optional)</span></label>
					<input
						id="society_address"
						name="society_address"
						type="text"
						placeholder="Philadelphia, PA"
					/>
				</div>
			</fieldset>

			<fieldset>
				<legend class="fieldset-legend t-label">First Account</legend>

				<div class="form-row">
					<div class="form-group">
						<label for="given_name">First name</label>
						<input id="given_name" name="given_name" type="text" required placeholder="Alex" />
					</div>

					<div class="form-group">
						<label for="surname">Last name</label>
						<input id="surname" name="surname" type="text" required placeholder="Rivera" />
					</div>
				</div>

				<div class="form-group">
					<label for="handle">Handle</label>
					<input
						id="handle"
						name="handle"
						type="text"
						required
						placeholder="alexrivera"
						pattern="[a-z0-9-]+"
						title="Lowercase letters, numbers, and hyphens only"
					/>
				</div>

				<div class="form-group">
					<label for="dob">Date of birth</label>
					<input id="dob" name="dob" type="date" required />
				</div>

				<div class="form-group">
					<label for="sex">Sex <span class="optional">(optional)</span></label>
					<select id="sex" name="sex">
						<option value="">Prefer not to say</option>
						<option value="male">Male</option>
						<option value="female">Female</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						minlength="8"
						placeholder="••••••••"
					/>
				</div>

				<div class="form-group">
					<label for="password_confirm">Confirm password</label>
					<input
						id="password_confirm"
						name="password_confirm"
						type="password"
						required
						minlength="8"
						placeholder="••••••••"
					/>
				</div>
			</fieldset>

			<button type="submit" class="btn btn--primary setup-submit">Set Up Society</button>
		</form>
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

	.setup-header p {
		margin: 0;
	}

	fieldset {
		border: 1px solid var(--border);
		padding: var(--space-5);
		margin-bottom: var(--space-5);
	}

	.fieldset-legend {
		padding: 0 var(--space-2);
		font-size: var(--text-sm);
		color: var(--ink-mid);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	/* form-group here has gap: space-1 + margin-bottom (differs from global) */
	.form-group {
		gap: var(--space-1);
		margin-bottom: var(--space-4);
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.optional {
		font-weight: 400;
		color: var(--ink-mid);
	}


	.input-hint {
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.setup-submit {
		width: 100%;
		margin-top: var(--space-2);
	}
</style>
