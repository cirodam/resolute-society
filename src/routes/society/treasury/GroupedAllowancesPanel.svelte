<script lang="ts">
	import { enhance } from '$app/forms';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ConfirmButton from '$lib/components/ConfirmButton.svelte';
	import { hasPermission } from '$lib/client/permissions';

	type Permissions = { isFounder: boolean; codes: string[] };
	type AllowanceGroup = {
		id: string;
		name: string;
		member_count: number;
		total_amount: number;
	};
	type GroupMember = {
		group_id: string;
		person_id: string;
		given_name: string;
		surname: string;
		handle: string;
		amount: number;
	};
	type Member = {
		id: string;
		given_name: string;
		surname: string;
		handle: string;
	};

	let {
		allowanceGroups,
		membersByGroup,
		members,
		permissions,
		form = null
	}: {
		allowanceGroups: AllowanceGroup[];
		membersByGroup: Record<string, GroupMember[]>;
		members: Member[];
		permissions: Permissions | undefined;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		form: any;
	} = $props();

	let expanded = $state(false);
	let showCreateGroupForm = $state(false);
	let expandedGroupId = $state<string | null>(null);
</script>

<div class="allowances-section">
	<button class="section-header-numbered" onclick={() => (expanded = !expanded)} type="button">
		<span class="section-number">2</span>
		<div class="section-header-text">
			<h2 class="section-title">Grouped Allowances</h2>
			<p class="section-subtitle">Manage allowance groups with individual member amounts</p>
		</div>
		<span class="chevron" class:expanded>▼</span>
	</button>

	{#if expanded}
		<Alert
			type="success"
			message={form?.allowanceSuccess
				? `Distributed ${form.distributed.toFixed(2)} credits to ${form.recipientCount} members in "${form.groupName}"`
				: null}
		/>
		<Alert type="error" message={form?.allowanceError ?? null} />
		<Alert type="success" message={form?.createGroupSuccess ? 'Allowance group created successfully' : null} />
		<Alert type="error" message={form?.createGroupError ?? null} />

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
				{#if hasPermission(permissions, 'treasury.create_allowance_group')}
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

			{#if allowanceGroups.length === 0}
				<EmptyState message="No allowance groups yet." />
			{:else}
				<div class="groups-list">
					{#each allowanceGroups as group}
						{@const groupMembers = membersByGroup[group.id] || []}
						<div class="group-card">
							<div class="group-header">
								<div class="group-info">
									<h4 class="group-name">{group.name}</h4>
									<p class="group-details">
										{group.member_count}
										{group.member_count === 1 ? 'member' : 'members'}
										· {group.total_amount.toFixed(2)} credits total
									</p>
								</div>
								<div class="group-actions">
									{#if hasPermission(permissions, 'treasury.run_allowance_group')}
										<form method="POST" action="?/runAllowanceGroup" use:enhance style="display: inline;">
											<input type="hidden" name="group_id" value={group.id} />
											<ConfirmButton
												class="btn btn--primary btn--small"
												disabled={group.member_count === 0}
											>
												Run
											</ConfirmButton>
										</form>
									{/if}
									<button
										type="button"
										class="btn btn--secondary btn--small"
										onclick={() =>
											(expandedGroupId = expandedGroupId === group.id ? null : group.id)}
									>
										{expandedGroupId === group.id ? 'Close' : 'Manage'}
									</button>
									{#if hasPermission(permissions, 'treasury.delete_allowance_group')}
										<form
											method="POST"
											action="?/deleteAllowanceGroup"
											use:enhance
											style="display: inline;"
										>
											<input type="hidden" name="group_id" value={group.id} />
											<ConfirmButton class="btn-remove" title="Delete group" confirmLabel="Delete?">×</ConfirmButton>
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
														{#if hasPermission(permissions, 'treasury.manage_allowance_members')}
															<form
																method="POST"
																action="?/updateMemberAmount"
																use:enhance
																class="amount-form"
															>
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
																<button type="submit" class="btn btn--small btn--secondary">
																	Update
																</button>
															</form>
														{/if}
														{#if hasPermission(permissions, 'treasury.manage_allowance_members')}
															<form
																method="POST"
																action="?/removeGroupMember"
																use:enhance
																style="display: inline;"
															>
																<input type="hidden" name="group_id" value={group.id} />
																<input type="hidden" name="person_id" value={member.person_id} />
																<ConfirmButton class="btn-remove-small" title="Remove member" confirmLabel="×?">×</ConfirmButton>
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
										{#if hasPermission(permissions, 'treasury.manage_allowance_members')}
											<form method="POST" action="?/addGroupMember" use:enhance>
												<input type="hidden" name="group_id" value={group.id} />
												<select name="person_id" required class="input">
													<option value="">Add member...</option>
													{#each members as member}
														<option value={member.id}>
															{member.given_name}
															{member.surname} ({member.handle})
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

<style>
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

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.input-hint {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
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

	:global(.btn-remove-small) {
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

	:global(.btn-remove-small:hover) {
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
</style>
