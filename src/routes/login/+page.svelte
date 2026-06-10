<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import Alert from '$lib/components/Alert.svelte';

	let { form }: { form: ActionData } = $props();
</script>

<div class="login-container">
	<div class="login-card card-border">
		<h1 class="t-display login-title">Society Login</h1>
		<p class="t-prose text-secondary login-subtitle">Enter your credentials to access your society.</p>

		<Alert type="error" message={form?.error} />

		<form method="POST" use:enhance class="login-form">
			<div class="form-group">
				<label for="handle">Handle</label>
				<input
					id="handle"
					name="handle"
					type="text"
					required
					placeholder="username"
				/>
			</div>

			<div class="form-group">
				<label for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					placeholder="••••••••"
				/>
			</div>

			<button type="submit" class="btn btn--primary login-submit">
				Sign In
			</button>
		</form>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
	}

	.login-card {
		width: 100%;
		max-width: 420px;
		padding: var(--space-6);
	}

	.login-title {
		font-size: var(--text-2xl);
		margin: 0 0 var(--space-2) 0;
		text-align: center;
	}

	.login-subtitle {
		margin: 0 0 var(--space-6) 0;
		text-align: center;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.login-submit {
		width: 100%;
		margin-top: var(--space-2);
	}
</style>
