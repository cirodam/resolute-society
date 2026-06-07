<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let result = $state<{ ok: boolean; settled?: string; error?: string } | null>(null);
	let pending = $state(false);
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Send</h1>
		<p class="page-header-description">Transfer credits directly. The federation settles immediately.</p>
	</div>

	{#if !data.isAdmitted}
		<div class="warning-banner card-border">
			This society is not yet admitted to the federation. Cross-society transfers are unavailable. Same-society transfers will still settle locally.
		</div>
	{/if}

	<div class="send-card card-border">
		<form
			method="POST"
			action="?/send"
			use:enhance={() => {
				pending = true;
				result = null;
				return async ({ result: r, update }) => {
					await update({ reset: false });
					pending = false;
					if (r.type === 'success' && r.data?.sent) {
						result = { ok: true, settled: r.data.settled as string };
					} else if (r.type === 'failure') {
						result = { ok: false, error: String(r.data?.sendError ?? 'Unknown error') };
					}
				};
			}}
			class="send-form"
		>
			<div class="form-row">
				<div class="form-group">
					<label for="fromPrincipal">From</label>
					<input
						id="fromPrincipal"
						name="fromPrincipal"
						type="text"
						value={data.fromPrincipal}
						placeholder="uuid@society-uuid"
						required
						class="input"
					/>
				</div>
				<div class="form-group">
					<label for="toPrincipal">To</label>
					<input
						id="toPrincipal"
						name="toPrincipal"
						type="text"
						placeholder="uuid@society-uuid"
						required
						class="input"
					/>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="currency">Currency</label>
					<select id="currency" name="currency" class="input">
						<option value="society_credits">Society Credits</option>
						<option value="federation_credits">Federation Credits</option>
					</select>
				</div>
				<div class="form-group">
					<label for="amount">Amount</label>
					<input
						id="amount"
						name="amount"
						type="number"
						step="0.01"
						min="0.01"
						required
						class="input"
					/>
				</div>
			</div>

			<button type="submit" class="btn btn--primary" disabled={pending || !data.hasKeypair}>
				{#if pending}
					Sending…
				{:else if !data.hasKeypair}
					Keypair not ready
				{:else}
					Send
				{/if}
			</button>
		</form>

		{#if result}
			{#if result.ok}
				<div class="result-message result-message--success">
					{#if result.settled === 'local'}
						Settled — transaction recorded in the local ledger.
					{:else}
						Submitted to the federation for processing.
					{/if}
				</div>
			{:else}
				<div class="result-message result-message--error">{result.error}</div>
			{/if}
		{/if}
	</div>

	<p class="slow-path-hint">
		If federation routing is unavailable, federation-credit transfers will be queued until service is restored.
	</p>
</div>

<style>
	.page-container {
		max-width: 640px;
		margin: 0 auto;
		padding: var(--space-6);
	}

	.warning-banner {
		padding: var(--space-4);
		margin-bottom: var(--space-6);
		background: var(--tint-gold);
		border-color: var(--gold);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--gold);
	}

	.send-card {
		padding: var(--space-6);
	}

	.send-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.result-message {
		margin-top: var(--space-5);
		padding: var(--space-3) var(--space-4);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid;
	}

	.result-message--success {
		background: var(--accent-lt);
		color: var(--accent);
		border-color: var(--accent);
	}

	.result-message--error {
		background: var(--danger-lt);
		color: var(--danger);
		border-color: var(--danger);
	}

	.slow-path-hint {
		margin-top: var(--space-6);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		text-align: center;
	}
</style>
