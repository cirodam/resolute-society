<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const person = $derived(data.person);

	function birthYear(dob: string) {
		return new Date(dob).getFullYear();
	}

	function age(dob: string) {
		return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
	}
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">My Profile</h1>
		<p class="page-header-description">{person.given_name} {person.surname} · @{person.handle}</p>
	</div>

	<!-- ── PROFILE ── -->
	<div class="card card-border">
		<div class="card-header">
			<h2>Profile</h2>
		</div>

		{#if form?.saved}
			<div class="success-message">Saved.</div>
		{/if}

		<form method="POST" action="?/update" use:enhance class="profile-form">
			<div class="form-group">
				<label for="sex">Sex <span class="optional">optional</span></label>
				<select id="sex" name="sex">
					<option value="" selected={!person.sex}>Prefer not to say</option>
					<option value="male" selected={person.sex === 'male'}>Male</option>
					<option value="female" selected={person.sex === 'female'}>Female</option>
					<option value="other" selected={person.sex === 'other'}>Other</option>
				</select>
			</div>

			<div class="form-group">
				<label for="bio">Bio</label>
				<textarea id="bio" name="bio" rows="3" placeholder="A few words about yourself.">{person.bio ?? ''}</textarea>
			</div>

			<div class="form-group">
				<label for="location_id">My Location</label>
				<select id="location_id" name="location_id">
					<option value="">— none —</option>
					{#each data.locations as loc}
						<option value={loc.id} selected={person.location_id === loc.id}>
							{loc.name}{loc.address ? ` · ${loc.address}` : ''}
						</option>
					{/each}
				</select>
				<span class="input-hint">Optional — associate yourself with a known society location.</span>
			</div>

			<div class="form-actions">
				<button type="submit" class="btn btn--primary">Save</button>
			</div>
		</form>
	</div>

	<!-- ── DEPENDANTS ── -->
	<div class="card card-border">
		<div class="card-header">
			<h2>Dependants</h2>
		</div>

		{#if form?.dependantError}
			<div class="error-message">{form.dependantError}</div>
		{/if}

		{#if data.dependants.length > 0}
			<div class="dependant-list">
				{#each data.dependants as dep}
					<div class="dependant-row">
						<span class="dependant-id t-label">born {birthYear(dep.dob)}</span>
						<span class="dependant-age">{age(dep.dob)} yrs</span>
						<span class="dependant-age">{dep.sex ? dep.sex : 'sex: not set'}</span>
						<form method="POST" action="?/removeDependant" use:enhance style="margin-left:auto">
							<input type="hidden" name="id" value={dep.id} />
							<button type="submit" class="btn btn--xs btn--danger">Remove</button>
						</form>
					</div>
				{/each}
			</div>
		{/if}

		<form method="POST" action="?/addDependant" use:enhance class="add-dependant-form">
			<div class="form-group">
				<label for="dep-dob">Date of Birth</label>
				<input id="dep-dob" name="dob" type="date" required />
			</div>
			<div class="form-group">
				<label for="dep-sex">Sex <span class="optional">optional</span></label>
				<select id="dep-sex" name="sex">
					<option value="">Prefer not to say</option>
					<option value="male">Male</option>
					<option value="female">Female</option>
					<option value="other">Other</option>
				</select>
			</div>
			<div class="form-group">
				<label for="co-guardian">Co-Guardian Handle <span class="optional">optional</span></label>
				<input id="co-guardian" name="co_guardian" type="text" placeholder="other-parent-handle" />
				<span class="input-hint">If provided, credits are split 50/50.</span>
			</div>
			<div class="form-actions">
				<button type="submit" class="btn btn--primary">Add Dependant</button>
			</div>
		</form>
	</div>

	<div class="nav-links">
		<a href="/profile" class="link">← My Passbook</a>
	</div>
</div>

<style>
	.page-container {
		max-width: 640px;
		margin: 0 auto;
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* page-header has margin-bottom: 0 here (overrides global) */
	.page-header { margin-bottom: 0; }
	/* page-header h1 has a tighter margin here */
	.page-header h1 { margin: 0 0 0.25rem 0; }

	/* success/error-message variants here use border-bottom (not full border) + different padding */
	.success-message {
		background: var(--accent-lt);
		color: var(--accent);
		padding: 0.75rem 1.5rem;
		margin-bottom: 0;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.error-message {
		background: var(--danger-lt);
		color: var(--danger);
		padding: 0.75rem 1.5rem;
		margin-bottom: 0;
		border: none;
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.profile-form,
	.add-dependant-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
	}

	.optional {
		font-family: var(--font-prose);
		font-weight: 400;
		color: var(--ink-faint);
		font-size: var(--text-xs);
		letter-spacing: 0;
	}

	.form-actions {
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
	}

	/* Dependant list */
	.dependant-list {
		border-bottom: 1px solid var(--border-subtle);
	}

	.dependant-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.6rem 1.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.dependant-id {
		font-size: var(--text-xs);
		letter-spacing: 0.1em;
		color: var(--ink-mid);
	}

	.dependant-age {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
	}

	.nav-links {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}
</style>
