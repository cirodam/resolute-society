<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatLongDate } from '$lib/client/datetime';
	import { governanceTabs } from '$lib/client/navigation';
	import { hasPermission } from '$lib/client/permissions';
	import Subnav from '$lib/components/Subnav.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data }: { data: PageData } = $props();

	const currentAssembly = $derived(data.assemblies.find((a) => a.status === 'current'));
	const precedingAssembly = $derived(data.assemblies.find((a) => a.status === 'preceding'));
	const followingAssembly = $derived(data.assemblies.find((a) => a.status === 'following'));


	function getSeats(assembly: typeof currentAssembly) {
		if (!assembly) return [];
		const members = data.assemblyMembers[assembly.id] || [];
		const seats = [];
		for (let i = 1; i <= assembly.seat_count; i++) {
			const member = members.find(m => m.seat_number === i);
			seats.push({ number: i, member: member || null });
		}
		return seats;
	}
</script>

<div class="page-container">
	<div class="page-header">
		<div class="section-header">
			<div>
				<h1 class="t-display">General Assembly</h1>
				<p class="page-header-description">The governing body of {data.society.name}</p>
			</div>
			<a href="/dashboard/assembly/print" class="btn btn--secondary btn--small">Print Roster</a>
		</div>
	</div>

	<Subnav tabs={governanceTabs} />

	<div class="page-content">
		{#if currentAssembly}
			<details class="assembly-section card-border">
				<summary class="assembly-summary">
					<div>
						<h2 class="section-title">Current Term (#{currentAssembly.term_number})</h2>
						<p class="term-dates">
							{formatLongDate(currentAssembly.term_start)} — {formatLongDate(currentAssembly.term_end)}
						</p>
					</div>
					<span class="summary-icon" aria-hidden="true">v</span>
				</summary>

				<div class="assembly-content">
					<div class="seats-grid">
						{#each getSeats(currentAssembly) as seat}
							<div class="seat-card card-border">
								<div class="seat-header">
									<span class="seat-number t-label">Seat {seat.number}</span>
								</div>
								{#if seat.member}
									<div class="seat-content">
										<a href="/person/{seat.member.person_id}" class="member-link">
											<p class="member-name">{seat.member.given_name} {seat.member.surname}</p>
											<p class="member-handle">{seat.member.handle}</p>
										</a>
										{#if hasPermission(data.permissions, 'assembly.unassign_seat')}
											<form method="POST" action="?/unassign" use:enhance>
												<input type="hidden" name="assembly_id" value={currentAssembly.id} />
												<input type="hidden" name="seat_number" value={seat.number} />
												<button type="submit" class="btn btn--secondary btn--small">
													Remove
												</button>
											</form>
										{/if}
									</div>
								{:else}
									<div class="seat-vacant">
										<p class="vacant">Vacant</p>
										{#if hasPermission(data.permissions, 'assembly.assign_seat')}
											<form method="POST" action="?/assign" use:enhance class="assign-form">
												<input type="hidden" name="assembly_id" value={currentAssembly.id} />
												<input type="hidden" name="seat_number" value={seat.number} />
												<select name="person_id" class="select" required>
													<option value="">Select...</option>
													{#each data.eligibleMembers as member}
														<option value={member.id}>
															{member.given_name} {member.surname}
														</option>
													{/each}
												</select>
												<button type="submit" class="btn btn--primary btn--small">
													Assign
												</button>
											</form>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</details>
		{/if}

		{#if followingAssembly}
			<details class="assembly-section card-border">
				<summary class="assembly-summary">
					<div>
						<h2 class="section-title">Following Term (#{followingAssembly.term_number})</h2>
						<p class="term-dates">
							{formatLongDate(followingAssembly.term_start)} — {formatLongDate(followingAssembly.term_end)}
						</p>
					</div>
					<span class="summary-icon" aria-hidden="true">v</span>
				</summary>

				<div class="assembly-content">
					<div class="seats-grid">
						{#each getSeats(followingAssembly) as seat}
							<div class="seat-card card-border">
								<div class="seat-header">
									<span class="seat-number t-label">Seat {seat.number}</span>
								</div>
								{#if seat.member}
									<div class="seat-content">
										<a href="/person/{seat.member.person_id}" class="member-link">
											<p class="member-name">{seat.member.given_name} {seat.member.surname}</p>
											<p class="member-handle">{seat.member.handle}</p>
										</a>
										{#if hasPermission(data.permissions, 'assembly.unassign_seat')}
											<form method="POST" action="?/unassign" use:enhance>
												<input type="hidden" name="assembly_id" value={followingAssembly.id} />
												<input type="hidden" name="seat_number" value={seat.number} />
												<button type="submit" class="btn btn--secondary btn--small">
													Remove
												</button>
											</form>
										{/if}
									</div>
								{:else}
									<div class="seat-vacant">
										<p class="vacant">Vacant</p>
										{#if hasPermission(data.permissions, 'assembly.assign_seat')}
											<form method="POST" action="?/assign" use:enhance class="assign-form">
												<input type="hidden" name="assembly_id" value={followingAssembly.id} />
												<input type="hidden" name="seat_number" value={seat.number} />
												<select name="person_id" class="select" required>
													<option value="">Select...</option>
													{#each data.eligibleMembers as member}
														<option value={member.id}>
															{member.given_name} {member.surname}
														</option>
													{/each}
												</select>
												<button type="submit" class="btn btn--primary btn--small">
													Assign
												</button>
											</form>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</details>
		{/if}

		{#if precedingAssembly}
			<details class="assembly-section card-border">
				<summary class="assembly-summary">
					<div>
						<h2 class="section-title">Preceding Term (#{precedingAssembly.term_number})</h2>
						<p class="term-dates">
							{formatLongDate(precedingAssembly.term_start)} — {formatLongDate(precedingAssembly.term_end)}
						</p>
					</div>
					<span class="summary-icon" aria-hidden="true">v</span>
				</summary>

				<div class="assembly-content">
					<div class="seats-grid">
						{#each getSeats(precedingAssembly) as seat}
							<div class="seat-card card-border">
								<div class="seat-header">
									<span class="seat-number t-label">Seat {seat.number}</span>
								</div>
								{#if seat.member}
									<a href="/person/{seat.member.person_id}" class="member-link">
										<p class="member-name">{seat.member.given_name} {seat.member.surname}</p>
										<p class="member-handle">{seat.member.handle}</p>
									</a>
								{:else}
									<p class="vacant">Vacant</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</details>
		{/if}

		{#if data.assemblies.length === 0}
			<EmptyState message="No general assembly terms have been created yet." />
		{/if}
	</div>
</div>

<style>
	.assembly-section {
		margin-bottom: var(--space-5);
		background: var(--surface);
	}

	.assembly-summary {
		list-style: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		cursor: pointer;
		padding: var(--space-4);
	}

	.assembly-summary::-webkit-details-marker {
		display: none;
	}

	.assembly-content {
		padding: 0 var(--space-4) var(--space-4);
	}

	.assembly-section[open] .assembly-summary {
		border-bottom: 1px solid var(--border-faint);
	}

	.term-dates {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.summary-icon {
		font-size: var(--text-sm);
		color: var(--ink-mid);
		transition: transform 0.15s ease;
	}

	.assembly-section[open] .summary-icon {
		transform: rotate(180deg);
	}

	.seats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: var(--space-4);
	}

	.seat-card {
		padding: var(--space-4);
		background: var(--surface);
	}

	.seat-header {
		margin-bottom: var(--space-3);
	}

	.seat-number {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.seat-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.member-link {
		display: block;
		text-decoration: none;
		color: inherit;
	}

	.member-link:hover .member-name {
		color: var(--gold);
	}

	.member-name {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		font-weight: 600;
		margin: 0 0 var(--space-1) 0;
		transition: color 0.15s;
	}

	.member-handle {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
	}

	.seat-vacant {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.vacant {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		color: var(--ink-faint);
		font-style: italic;
		margin: 0;
	}

	.assign-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.select {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}
</style>
