<script lang="ts">
	import { PERMISSION } from '$lib/permissions';
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import { hasPermission } from '$lib/client/permissions';

	type Permissions = { isFounder: boolean; codes: string[] };
	type Position = {
		id: string;
		name: string;
		unit_name: string;
		current_person_id: string | null;
		given_name: string | null;
		surname: string | null;
		current_allowance: number;
		default_allowance: number;
		allowance_modification_reason: string | null;
	};

	let {
		positions,
		permissions,
		form = null
	}: {
		positions: Position[];
		permissions: Permissions | undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	let expanded = $state(false);
	let expandedPositionId = $state<string | null>(null);

	const totalPayroll = $derived(() =>
		positions
			.filter((p) => p.current_person_id && p.current_allowance > 0)
			.reduce((sum, p) => sum + p.current_allowance, 0)
	);

	const filledCount = $derived(() =>
		positions.filter((p) => p.current_person_id && p.current_allowance > 0).length
	);

</script>

<div class="payroll-section">
	<button class="section-header-numbered" onclick={() => (expanded = !expanded)} type="button">
		<span class="section-number">3</span>
		<div class="section-header-text">
			<h2 class="section-title">Position Payroll</h2>
			<p class="section-subtitle">Distribute allowances to position holders</p>
		</div>
		<span class="chevron" class:expanded>▼</span>
	</button>

	{#if expanded}
		<Alert
			type="success"
			message={form?.payrollSuccess
				? `Paid ${form.paidCount} ${form.paidCount === 1 ? 'position' : 'positions'} for ${form.totalAmount.toFixed(2)} credits total`
				: null}
		/>
		<Alert type="error" message={form?.payrollError ?? null} />
		<Alert type="success" message={form?.adjustAllowanceSuccess ? 'Allowance adjusted successfully' : null} />
		<Alert type="error" message={form?.adjustAllowanceError ?? null} />

		<div class="payroll-display card-border">
			<div class="payroll-header">
				<div class="payroll-summary">
					<p class="payroll-info">
						{filledCount()} filled {filledCount() === 1 ? 'position' : 'positions'}
						· {totalPayroll().toFixed(2)} credits total
					</p>
				</div>
				{#if hasPermission(permissions, PERMISSION.TREASURY_RUN_POSITION_PAYROLL)}
					<form method="POST" action="?/runPositionPayroll" use:enhance>
						<ConfirmButton class="btn btn--primary" disabled={filledCount() === 0}>
							Run Position Payroll
						</ConfirmButton>
					</form>
				{/if}
			</div>

			{#if positions.length === 0}
				<EmptyState message="No positions created yet." />
			{:else}
				<div class="positions-grid">
					{#each positions as position}
						<div class="position-card">
							<div class="position-header">
								<div class="position-info">
									<h4 class="position-name">{position.name}</h4>
									<span class="position-type-badge">{position.unit_name}</span>
								</div>
								{#if position.current_person_id}
									<div class="position-holder">
										<p class="holder-name">{position.given_name} {position.surname}</p>
										<p class="holder-allowance">{position.current_allowance.toFixed(2)} credits</p>
									</div>
								{:else}
									<div class="position-vacant">
										<p class="vacant-text">Vacant</p>
									</div>
								{/if}
							</div>

							{#if position.current_person_id}
								<button
									type="button"
									class="btn btn--secondary btn--small"
									style="margin-top: var(--space-3);"
									onclick={() =>
										(expandedPositionId =
											expandedPositionId === position.id ? null : position.id)}
								>
									{expandedPositionId === position.id ? 'Close' : 'Adjust Allowance'}
								</button>

								{#if expandedPositionId === position.id}
									<div class="adjust-form">
										{#if hasPermission(permissions, PERMISSION.TREASURY_ADJUST_POSITION_ALLOWANCE)}
											<form method="POST" action="?/adjustPositionAllowance" use:enhance>
												<input type="hidden" name="position_id" value={position.id} />

												<div class="form-group">
													<div class="form-label">Default Allowance</div>
													<p class="form-value">{position.default_allowance.toFixed(2)} credits</p>
												</div>

												<div class="form-group">
													<label for="current-allowance-{position.id}" class="form-label">
														Current Allowance
													</label>
													<input
														id="current-allowance-{position.id}"
														type="number"
														name="current_allowance"
														value={position.current_allowance}
														min="0"
														step="0.01"
														required
														class="input"
													/>
												</div>

												<div class="form-group">
													<label for="reason-{position.id}" class="form-label">
														Reason for Adjustment
													</label>
													<textarea
														id="reason-{position.id}"
														name="reason"
														class="textarea"
														rows="2"
														placeholder="Optional: explain why this differs from default"
													>{position.allowance_modification_reason || ''}</textarea>
												</div>

												<button type="submit" class="btn btn--primary btn--small">
													Save Changes
												</button>
											</form>
										{/if}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.payroll-section {
		margin-top: var(--space-8);
		margin-bottom: var(--space-8);
	}

	.payroll-display {
		padding: var(--space-5);
		background: var(--surface);
	}

	.payroll-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-5);
	}

	.payroll-summary {
		flex: 1;
	}

	.payroll-info {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.positions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: var(--space-4);
	}

	.position-card {
		padding: var(--space-4);
		background: var(--surface-dk);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-md, 8px);
	}

	.position-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: var(--space-3);
	}

	.position-info {
		flex: 1;
	}

	.position-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0 0 var(--space-2) 0;
	}

	.position-type-badge {
		display: inline-block;
		font-family: var(--font-label);
		font-size: var(--text-xs);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-gold);
		color: var(--gold);
		border-radius: var(--radius-sm, 4px);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.position-holder {
		text-align: right;
	}

	.holder-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
	}

	.holder-allowance {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.position-vacant {
		text-align: right;
	}

	.vacant-text {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	.adjust-form {
		margin-top: var(--space-4);
		padding: var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-sm, 4px);
	}

	.adjust-form .form-group {
		margin-bottom: var(--space-3);
	}

	.adjust-form .form-group:last-of-type {
		margin-bottom: var(--space-4);
	}

	.form-label {
		display: block;
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: var(--space-2);
	}

	.form-value {
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.adjust-form .input,
	.adjust-form .textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm, 4px);
		background: var(--surface);
	}

	.adjust-form .textarea {
		resize: vertical;
	}
</style>
