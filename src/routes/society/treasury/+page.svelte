<script lang="ts">
	import { enhance } from '$app/forms';
	import { economyTabs } from '$lib/client/navigation';
	import { hasPermission } from '$lib/client/permissions';
	import type { PageData, ActionData } from './$types';
	import Subnav from '$lib/components/Subnav.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const society = $derived(data.society);

	let demurrageMode = $state<'percent' | 'flat'>('percent');
	let demurrageValue = $state(0);
	let transferHandle = $state('');
	let transferAmount = $state(0);
	let showCreateGroupForm = $state(false);
	let expandedGroupId = $state<string | null>(null);
	let expandedPositionId = $state<string | null>(null);
	let universalAmount = $state(0);

	// Track which disbursement sections are expanded
	let universalExpanded = $state(false);
	let groupedExpanded = $state(false);
	let payrollExpanded = $state(false);
	let transferExpanded = $state(false);

	// Calculate the preview based on mode
	const demurragePreview = $derived(() => {
		if (data.principalCredits === 0) return 'No principals with credits';

		if (demurrageMode === 'percent') {
			const totalAmount = (data.principalCredits * demurrageValue) / 100;
			return `≈ ${totalAmount.toFixed(2)} total from principals`;
		} else {
			// Show percentage
			const percent = (demurrageValue / data.principalCredits) * 100;
			return `≈ ${percent.toFixed(2)}% of principal holdings`;
		}
	});

	// Calculate total payroll for filled positions
	const totalPayroll = $derived(() => {
		return data.positions
			.filter(p => p.current_person_id && p.current_allowance > 0)
			.reduce((sum, p) => sum + p.current_allowance, 0);
	});

	const filledPositionsCount = $derived(() => {
		return data.positions.filter(p => p.current_person_id && p.current_allowance > 0).length;
	});

	function formatPositionType(type: string): string {
		if (type === 'officer') return 'Officer';
		if (type === 'section_chief') return 'Section Chief';
		if (type === 'line_worker') return 'Line Worker';
		return type;
	}

	const universalAllowancePreview = $derived(() => {
		if (data.memberCount === 0) return 'No members in society';
		const total = data.memberCount * universalAmount;
		return `${data.memberCount} ${data.memberCount === 1 ? 'member' : 'members'} · ${total.toFixed(2)} credits total`;
	});
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Treasury</h1>
		<p class="page-header-description">
			{society.name} balances and transactions
		</p>
	</div>

	<Subnav tabs={economyTabs} />

	<div class="page-content">
		<div class="balances-grid">
			<div class="balance-card card-border">
				<div class="balance-label t-label">Society Treasury</div>
				<div class="balance-amount t-numeric">{society.society_credits.toFixed(2)}</div>
			</div>

			<div class="balance-card card-border">
				<div class="balance-label t-label">Federation Credits</div>
				<div class="balance-amount t-numeric">{society.federation_credits.toFixed(2)}</div>
			</div>
		</div>

		<div class="money-supply-section">
			<div class="money-supply-card card-border-accent">
				<h3 class="supply-title t-prose">Money Supply</h3>
				<div class="supply-columns">
					<div class="supply-col">
						<span class="supply-col-label t-label">Actual</span>
						<span class="supply-col-amount t-numeric">{data.totalMoneySupply.toFixed(2)}</span>
					</div>
					<div class="supply-divider"></div>
					<div class="supply-col">
						<span class="supply-col-label t-label">Expected (person-years)</span>
						<span class="supply-col-amount t-numeric">{data.expectedMoneySupply.toFixed(2)}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="demurrage-section">
			<h2 class="section-title">Supply Reconciliation</h2>

			{#if form?.endowmentMintSuccess}
				<div class="success-message">
					Minted {form.minted.toFixed(2)} credits to treasury. Supply is now {form.totalSupply.toFixed(2)} against target {form.expectedSupply.toFixed(2)}.
				</div>
			{/if}

			{#if form?.supplyReconcileSuccess}
				<div class="success-message">
					Burned {form.burned.toFixed(2)} credits across {form.principalCount} principals. Remaining excess: {form.remainingExcess.toFixed(2)}.
				</div>
			{/if}

			<div class="demurrage-card card-border">
				<p class="demurrage-description">
					Reconcile supply against person-year endowment. Mint fills shortfall; reconciliation demurrage burns excess.
				</p>

				{#if hasPermission(data.permissions, 'treasury.run_demurrage')}
					<div class="reconcile-actions">
						<form method="POST" action="?/reconcileEndowmentMint" use:enhance>
							<button type="submit" class="btn btn--secondary">Mint Endowment Shortfall</button>
						</form>
						<form method="POST" action="?/runSupplyReconciliationDemurrage" use:enhance>
							<button type="submit" class="btn btn--primary">Run Supply Reconciliation Demurrage</button>
						</form>
					</div>
				{/if}
			</div>
		</div>

		<div class="demurrage-section">
			<h2 class="section-title">Run Demurrage</h2>

			{#if form?.success}
				<div class="success-message">
					Collected {form.collected.toFixed(2)} credits from {form.principalCount} principals
				</div>
			{/if}

			{#if form?.error}
				<div class="error-message">{form.error}</div>
			{/if}

			<div class="demurrage-card card-border">
				<p class="demurrage-description">
					Collect society credits from all members and associations to the treasury
				</p>

				{#if hasPermission(data.permissions, 'treasury.run_demurrage')}
					<form method="POST" action="?/runDemurrage" use:enhance class="demurrage-form">
					<input type="hidden" name="mode" value={demurrageMode} />

					<div class="mode-toggle">
						<button
							type="button"
							class="mode-btn"
							class:active={demurrageMode === 'percent'}
							onclick={() => (demurrageMode = 'percent')}
						>
							Percentage
						</button>
						<button
							type="button"
							class="mode-btn"
							class:active={demurrageMode === 'flat'}
							onclick={() => (demurrageMode = 'flat')}
						>
							Flat Amount
						</button>
					</div>

					<div class="input-group">
						{#if demurrageMode === 'percent'}
							<label for="value">Percentage to collect from each principal</label>
							<div class="input-with-unit">
								<input
									id="value"
									name="value"
									type="number"
									step="0.01"
									min="0"
									max="100"
									bind:value={demurrageValue}
									required
								/>
								<span class="unit">%</span>
							</div>
							<span class="input-hint">{demurragePreview()}</span>
						{:else}
							<label for="value">Fixed amount to collect from each principal</label>
							<div class="input-with-unit">
								<input
									id="value"
									name="value"
									type="number"
									step="0.01"
									min="0"
									bind:value={demurrageValue}
									required
								/>
								<span class="unit">credits</span>
							</div>
							<span class="input-hint">{demurragePreview()}</span>
						{/if}
					</div>

					<button type="submit" class="btn btn--primary">
						Run Demurrage
					</button>
				</form>
			{/if}
			</div>
		</div>

		<div class="disbursement-divider">
			<h2 class="disbursement-header t-display-sm">Credit Disbursement Methods</h2>
			<p class="disbursement-description">Four ways to distribute society credits to members</p>
		</div>

		<div class="universal-allowances-section">
			<button
				class="section-header-numbered"
				onclick={() => universalExpanded = !universalExpanded}
				type="button"
			>
				<span class="section-number">1</span>
				<div class="section-header-text">
					<h2 class="section-title">Universal Allowances</h2>
					<p class="section-subtitle">Distribute equal amount to all members</p>
				</div>
				<span class="chevron" class:expanded={universalExpanded}>▼</span>
			</button>

			{#if universalExpanded}
				{#if form?.universalAllowanceSuccess}
					<div class="success-message">
						Distributed {form.amountPerMember.toFixed(2)} credits to {form.memberCount} {form.memberCount === 1 ? 'member' : 'members'} ({form.totalAmount.toFixed(2)} total)
					</div>
				{/if}

				{#if form?.universalAllowanceError}
					<div class="error-message">{form.universalAllowanceError}</div>
				{/if}

				<div class="universal-allowance-form card-border">
					{#if hasPermission(data.permissions, 'treasury.distribute_universal_allowance')}
						<form method="POST" action="?/distributeUniversalAllowance" use:enhance>
						<div class="form-row-inline">
							<div class="input-group-inline">
								<label for="universal-amount">Amount per member</label>
								<div class="input-with-unit">
									<input
										id="universal-amount"
										name="amount"
										type="number"
										bind:value={universalAmount}
										step="0.01"
										min="0"
										required
									/>
									<span class="unit">credits</span>
								</div>
								<span class="input-hint">{universalAllowancePreview()}</span>
							</div>
							<button type="submit" class="btn btn--primary">
								Distribute to All Members
							</button>
						</div>
					</form>
					{/if}
				</div>
			{/if}
		</div>

		<div class="allowances-section">
			<button
				class="section-header-numbered"
				onclick={() => groupedExpanded = !groupedExpanded}
				type="button"
			>
				<span class="section-number">2</span>
				<div class="section-header-text">
					<h2 class="section-title">Grouped Allowances</h2>
					<p class="section-subtitle">Manage allowance groups with individual member amounts</p>
				</div>
				<span class="chevron" class:expanded={groupedExpanded}>▼</span>
			</button>

			{#if groupedExpanded}

			{#if form?.allowanceSuccess}
				<div class="success-message">
					Distributed {form.distributed.toFixed(2)} credits to {form.recipientCount} members in "{form.groupName}"
				</div>
			{/if}

			{#if form?.allowanceError}
				<div class="error-message">{form.allowanceError}</div>
			{/if}

			{#if form?.createGroupSuccess}
				<div class="success-message">Allowance group created successfully</div>
			{/if}

			{#if form?.createGroupError}
				<div class="error-message">{form.createGroupError}</div>
			{/if}

			<div class="groups-display card-border">
				<div class="groups-header">
					<h3 class="t-prose" style="font-weight: 600; margin: 0;">Groups</h3>
					<button
						type="button"
						class="btn btn--secondary"
						onclick={() => (showCreateGroupForm = !showCreateGroupForm)}
					>
						{showCreateGroupForm ? 'Cancel' : '+ Create Group'}
					</button>
				</div>

				{#if showCreateGroupForm}
					{#if hasPermission(data.permissions, 'treasury.create_allowance_group')}
						<form method="POST" action="?/createAllowanceGroup" use:enhance class="create-group-form">
						<div class="input-group">
							<label for="group-name">Group Name</label>
							<input
								id="group-name"
								name="name"
								type="text"
								required
								placeholder="e.g., Officers, Active Members"
							/>
							<span class="input-hint">Members will have individual allowance amounts</span>
						</div>


						<button type="submit" class="btn btn--primary">Create Group</button>
					</form>
					{/if}
				{/if}

				{#if data.allowanceGroups.length === 0}
					<p class="empty-state">No allowance groups yet.</p>
				{:else}
					<div class="groups-list">
						{#each data.allowanceGroups as group}
							{@const groupMembers = data.membersByGroup[group.id] || []}
							<div class="group-card">
								<div class="group-header">
									<div class="group-info">
										<h4 class="group-name">{group.name}</h4>
										<p class="group-details">
											{group.member_count} {group.member_count === 1 ? 'member' : 'members'}
											· {group.total_amount.toFixed(2)} credits total
										</p>
									</div>
									<div class="group-actions">
										{#if hasPermission(data.permissions, 'treasury.run_allowance_group')}
<form method="POST" action="?/runAllowanceGroup" use:enhance style="display: inline;">
											<input type="hidden" name="group_id" value={group.id} />
											<button
												type="submit"
												class="btn btn--primary btn--small"
												disabled={group.member_count === 0}
											>
												Run
											</button>
										</form>
										{/if}
										<button
											type="button"
											class="btn btn--secondary btn--small"
											onclick={() => expandedGroupId = expandedGroupId === group.id ? null : group.id}
										>
											{expandedGroupId === group.id ? 'Close' : 'Manage'}
										</button>
										{#if hasPermission(data.permissions, 'treasury.delete_allowance_group')}
<form method="POST" action="?/deleteAllowanceGroup" use:enhance style="display: inline;">
											<input type="hidden" name="group_id" value={group.id} />
											<button type="submit" class="btn-remove" title="Delete group">×</button>
										</form>
										{/if}
									</div>
								</div>

								{#if expandedGroupId === group.id}
									<div class="group-members">
										<h5 class="members-title t-label">Members</h5>

										{#if groupMembers.length > 0}
											<div class="members-list">
												{#each groupMembers as member}
													<div class="member-row">
														<div class="member-info">
															<span class="member-name">{member.given_name} {member.surname}</span>
															<span class="member-handle">({member.handle})</span>
														</div>
														<div class="member-actions">
															{#if hasPermission(data.permissions, 'treasury.manage_allowance_members')}
<form method="POST" action="?/updateMemberAmount" use:enhance class="amount-form">
																<input type="hidden" name="group_id" value={group.id} />
																<input type="hidden" name="person_id" value={member.person_id} />
																<input
																	type="number"
																	name="amount"
																	value={member.amount}
																	step="0.01"
																	min="0"
																	required
																	class="amount-input"
																/>
																<button type="submit" class="btn btn--small btn--secondary">Update</button>
															</form>
																	{/if}
															{#if hasPermission(data.permissions, 'treasury.manage_allowance_members')}
<form method="POST" action="?/removeGroupMember" use:enhance style="display: inline;">
																<input type="hidden" name="group_id" value={group.id} />
																<input type="hidden" name="person_id" value={member.person_id} />
																<button type="submit" class="btn-remove-small" title="Remove member">×</button>
															</form>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<p class="empty-state-small">No members yet.</p>
										{/if}

										<div class="add-member-form">
											{#if hasPermission(data.permissions, 'treasury.manage_allowance_members')}
<form method="POST" action="?/addGroupMember" use:enhance>
												<input type="hidden" name="group_id" value={group.id} />
												<select name="person_id" required class="input">
													<option value="">Add member...</option>
													{#each data.members as member}
														<option value={member.id}>
															{member.given_name} {member.surname} ({member.handle})
														</option>
													{/each}
												</select>
												<input
													type="number"
													name="amount"
													placeholder="Amount"
													step="0.01"
													min="0"
													required
													class="amount-input"
												/>
												<button type="submit" class="btn btn--primary btn--small">Add</button>
											</form>
												{/if}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="payroll-section">
			<button
				class="section-header-numbered"
				onclick={() => payrollExpanded = !payrollExpanded}
				type="button"
			>
				<span class="section-number">3</span>
				<div class="section-header-text">
					<h2 class="section-title">Position Payroll</h2>
					<p class="section-subtitle">Distribute allowances to position holders</p>
				</div>
				<span class="chevron" class:expanded={payrollExpanded}>▼</span>
			</button>

			{#if payrollExpanded}

			{#if form?.payrollSuccess}
				<div class="success-message">
					Paid {form.paidCount} {form.paidCount === 1 ? 'position' : 'positions'} for {form.totalAmount.toFixed(2)} credits total
				</div>
			{/if}

			{#if form?.payrollError}
				<div class="error-message">{form.payrollError}</div>
			{/if}

			{#if form?.adjustAllowanceSuccess}
				<div class="success-message">Allowance adjusted successfully</div>
			{/if}

			{#if form?.adjustAllowanceError}
				<div class="error-message">{form.adjustAllowanceError}</div>
			{/if}

			<div class="payroll-display card-border">
				<div class="payroll-header">
					<div class="payroll-summary">
						<p class="payroll-info">
							{filledPositionsCount()} filled {filledPositionsCount() === 1 ? 'position' : 'positions'}
							· {totalPayroll().toFixed(2)} credits total
						</p>
					</div>
					{#if hasPermission(data.permissions, 'treasury.run_position_payroll')}
<form method="POST" action="?/runPositionPayroll" use:enhance>
						<button
							type="submit"
							class="btn btn--primary"
							disabled={filledPositionsCount() === 0}
						>
							Run Position Payroll
						</button>
					</form>
					{/if}
				</div>

				{#if data.positions.length === 0}
					<p class="empty-state">No positions created yet.</p>
				{:else}
					<div class="positions-grid">
						{#each data.positions as position}
							<div class="position-card">
								<div class="position-header">
									<div class="position-info">
										<h4 class="position-name">{position.name}</h4>
										<span class="position-type-badge">{formatPositionType(position.type)}</span>
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
										onclick={() => expandedPositionId = expandedPositionId === position.id ? null : position.id}
									>
										{expandedPositionId === position.id ? 'Close' : 'Adjust Allowance'}
									</button>

									{#if expandedPositionId === position.id}
										<div class="adjust-allowance-form">
											{#if hasPermission(data.permissions, 'treasury.adjust_position_allowance')}
<form method="POST" action="?/adjustPositionAllowance" use:enhance>
												<input type="hidden" name="position_id" value={position.id} />

												<div class="form-group">
													<div class="form-label">Default Allowance</div>
													<p class="form-value">{position.default_allowance.toFixed(2)} credits</p>
												</div>

												<div class="form-group">
													<label for="current-allowance-{position.id}" class="form-label">Current Allowance</label>
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
													<label for="reason-{position.id}" class="form-label">Reason for Adjustment</label>
													<textarea
														id="reason-{position.id}"
														name="reason"
														class="textarea"
														rows="2"
														placeholder="Optional: explain why this differs from default"
													>{position.allowance_modification_reason || ''}</textarea>
												</div>

												<button type="submit" class="btn btn--primary btn--small">Save Changes</button>
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

		<div class="transfer-section">
			<button
				class="section-header-numbered"
				onclick={() => transferExpanded = !transferExpanded}
				type="button"
			>
				<span class="section-number">4</span>
				<div class="section-header-text">
					<h2 class="section-title">One-Off Transfers</h2>
					<p class="section-subtitle">Send credits to specific member or association</p>
				</div>
				<span class="chevron" class:expanded={transferExpanded}>▼</span>
			</button>

			{#if transferExpanded}

			{#if form?.transferSuccess}
				<div class="success-message">
					Transferred {form.amount.toFixed(2)} credits to {form.recipient}
				</div>
			{/if}

			{#if form?.transferError}
				<div class="error-message">{form.transferError}</div>
			{/if}

			<div class="transfer-card card-border">
				<p class="transfer-description">
					Send society credits from the treasury to a member or association
				</p>

				{#if hasPermission(data.permissions, 'treasury.transfer')}
<form method="POST" action="?/transfer" use:enhance class="transfer-form">
					<div class="input-group">
						<label for="handle">Member or Association Handle</label>
						<input
							id="handle"
							name="handle"
							type="text"
							bind:value={transferHandle}
							placeholder="username or association-handle"
							required
						/>
						<span class="input-hint">Enter member or association handle</span>
					</div>

					<div class="input-group">
						<label for="amount">Amount</label>
						<div class="input-with-unit">
							<input
								id="amount"
								name="amount"
								type="number"
								step="0.01"
								min="0"
								max={society.society_credits}
								bind:value={transferAmount}
								required
							/>
							<span class="unit">credits</span>
						</div>
						<span class="input-hint">Maximum: {society.society_credits.toFixed(2)}</span>
					</div>

					<button type="submit" class="btn btn--primary">
						Transfer Credits
					</button>
				</form>
					{/if}
			</div>

			<div class="transfer-card card-border" style="margin-top: var(--space-4, 1.25rem);">
				<p class="transfer-description">
					Send federation credits from the treasury to any principal
				</p>

				{#if form?.federationTransferSuccess}
					<div class="success-message">
						Submitted — {form.amount.toFixed(2)} fed credits to {form.toPrincipal}
					</div>
				{/if}

				{#if form?.federationTransferError}
					<div class="error-message">{form.federationTransferError}</div>
				{/if}

				{#if hasPermission(data.permissions, 'treasury.transfer')}
					<form method="POST" action="?/transferFederationCredits" use:enhance class="transfer-form">
						<div class="input-group">
							<label for="fed-to-principal">Recipient principal</label>
							<input
								id="fed-to-principal"
								name="toPrincipal"
								type="text"
								placeholder="handle@society"
								required
							/>
						</div>

						<div class="input-group">
							<label for="fed-amount">Amount</label>
							<div class="input-with-unit">
								<input
									id="fed-amount"
									name="amount"
									type="number"
									step="0.01"
									min="0.01"
									required
								/>
								<span class="unit">fed credits</span>
							</div>
						</div>

						<button type="submit" class="btn btn--primary">Send Federation Credits</button>
					</form>
				{/if}
			</div>
		{/if}

</div>
</div>
</div>

<style>
	.balances-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.balance-card {
		padding: var(--space-5);
		text-align: center;
	}

	.balance-label {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin-bottom: var(--space-3);
		text-transform: lowercase;
	}

	.balance-amount {
		font-size: var(--text-3xl);
		color: var(--ink);
	}

	.money-supply-section {
		margin-top: var(--space-6);
		padding-top: var(--space-6);
		border-top: 1px solid var(--border-subtle);
	}

	.money-supply-card {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.supply-title {
		font-weight: 600;
		margin: 0;
		font-size: var(--text-lg);
	}

	.supply-columns {
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		align-items: stretch;
	}

	.supply-col {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-5);
		flex: 1;
		min-width: 140px;
	}

	.supply-col:first-child {
		padding-left: 0;
	}

	.supply-col-label {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.supply-col-amount {
		font-size: var(--text-2xl);
		color: var(--ink);
	}

	.supply-divider {
		width: 1px;
		background: var(--border-subtle);
		align-self: stretch;
		margin: var(--space-1) 0;
	}

	.demurrage-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.demurrage-card {
		padding: var(--space-5);
	}

	.demurrage-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5) 0;
	}

	.reconcile-actions {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: var(--space-3);
	}

	.demurrage-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.mode-toggle {
		display: flex;
		gap: var(--space-2);
	}

	.mode-btn {
		flex: 1;
		padding: var(--space-3);
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.1em;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--ink-mid);
		cursor: pointer;
		transition: all 0.15s;
	}

	.mode-btn:hover {
		border-color: var(--border-strong);
	}

	.mode-btn.active {
		background: var(--accent);
		border-color: var(--accent);
		color: white;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.input-group label {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.1em;
		color: var(--ink-mid);
	}

	.input-with-unit {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.input-with-unit input {
		flex: 1;
		padding: var(--space-3);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-prose);
		font-size: var(--text-base);
	}

	.input-with-unit input:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.unit {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		white-space: nowrap;
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}

	.transfer-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.transfer-card {
		padding: var(--space-5);
	}

	.transfer-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0 0 var(--space-5) 0;
	}

	.transfer-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.allowances-section {
		margin-top: var(--space-8);
		padding-top: var(--space-8);
		border-top: 1px solid var(--border);
	}

	.groups-display {
		padding: var(--space-5);
	}

	.groups-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-5);
		gap: var(--space-3);
	}

	.create-group-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--paper);
		border: 1px solid var(--border-faint);
		margin-bottom: var(--space-4);
	}

	.create-group-form input[type='text'] {
		padding: var(--space-3);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-prose);
		font-size: var(--text-base);
	}

	.create-group-form input[type='text']:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.groups-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.group-card {
		padding: var(--space-4);
		background: var(--paper);
		border: 1px solid var(--border-faint);
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
	}

	.group-info {
		flex: 1;
	}

	.group-name {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
	}

	.group-details {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.group-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* btn--small:disabled needs local override */
	.btn--small:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.group-members {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: 1px solid var(--border-faint);
	}

	.members-title {
		font-size: var(--text-sm);
		margin-bottom: var(--space-3);
		color: var(--ink-mid);
	}

	.add-member-form form {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.add-member-form select {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.add-member-form select:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.members-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}

	.member-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2);
		background: var(--paper);
		border: 1px solid var(--border-faint);
		gap: var(--space-3);
	}

	.member-info {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		flex: 1;
	}

	.member-name {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.member-handle {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.member-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.amount-form {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.amount-input {
		width: 80px;
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.amount-input:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.btn-remove-small {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--danger);
		padding: 0;
		width: 20px;
		height: 20px;
		cursor: pointer;
		font-size: var(--text-base);
		line-height: 1;
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.btn-remove-small:hover {
		background: var(--danger-lt);
		border-color: var(--danger);
	}

	.empty-state-small {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		font-style: italic;
		margin-bottom: var(--space-3);
	}

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
		font-family: var(--font-numeric);
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

	.adjust-allowance-form {
		margin-top: var(--space-4);
		padding: var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border-faint);
		border-radius: var(--radius-sm, 4px);
	}

	.adjust-allowance-form .form-group {
		margin-bottom: var(--space-3);
	}

	.adjust-allowance-form .form-group:last-of-type {
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
		font-family: var(--font-numeric);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.adjust-allowance-form .input,
	.adjust-allowance-form .textarea {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm, 4px);
		background: var(--surface);
	}

	.adjust-allowance-form .textarea {
		resize: vertical;
	}

	.disbursement-divider {
		margin: var(--space-10) 0 var(--space-8) 0;
		padding: var(--space-6) 0;
		border-top: 2px solid var(--border);
		border-bottom: 2px solid var(--border);
		text-align: center;
	}

	.disbursement-header {
		font-size: var(--text-2xl);
		margin: 0 0 var(--space-2) 0;
		color: var(--ink);
	}

	.disbursement-description {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-mid);
		margin: 0;
	}

	.section-header-numbered {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		transition: opacity 0.15s;
	}

	.section-header-numbered:hover {
		opacity: 0.7;
	}

	.section-header-text {
		flex: 1;
	}

	.chevron {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		transition: transform 0.2s ease;
		flex-shrink: 0;
		margin-top: 4px;
	}

	.chevron.expanded {
		transform: rotate(180deg);
	}

	.section-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: var(--accent);
		color: var(--paper);
		font-family: var(--font-label);
		font-size: var(--text-lg);
		font-weight: 700;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.section-subtitle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: var(--space-1) 0 0 0;
	}

	.universal-allowances-section {
		margin-bottom: var(--space-8);
	}

	.universal-allowance-form {
		padding: var(--space-5);
		background: var(--surface);
	}

	.form-row-inline {
		display: flex;
		align-items: flex-end;
		gap: var(--space-4);
	}

	.input-group-inline {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.input-group-inline label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}
</style>
