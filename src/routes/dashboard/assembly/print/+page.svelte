<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate, formatShortDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, assemblies, assemblyMembers, printedAt } = $derived(data);

	const current = $derived(assemblies.find((a) => a.status === 'current') ?? assemblies[assemblies.length - 1]);
</script>

<PrintToolbar backHref="/dashboard/assembly" backLabel="← Assembly" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">General Assembly</div>
	</header>

	{#if !current}
		<p class="empty">No assembly found.</p>
	{:else}
		{@const members = (assemblyMembers[current.id] ?? []).sort((a, b) => a.seat_number - b.seat_number)}
		<div class="assembly-meta">
			<span>Term {current.term_number}</span>
			<span>{formatShortDate(current.term_start)} – {formatShortDate(current.term_end)}</span>
			<span>{members.length} / {current.seat_count} seats filled</span>
		</div>

		<table class="seats-table">
			<thead>
				<tr>
					<th>Seat</th>
					<th>Member</th>
					<th>Handle</th>
				</tr>
			</thead>
			<tbody>
				{#each Array(current.seat_count) as _, i}
					{@const seat = i + 1}
					{@const member = members.find((m) => m.seat_number === seat)}
					<tr class:row-vacant={!member}>
						<td class="col-seat">{seat}</td>
						<td class="col-name">{member ? `${member.given_name} ${member.surname}` : '—'}</td>
						<td class="col-handle">{member ? `@${member.handle}` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<footer class="doc-footer">
		<span>{society.name}</span>
		<span>Printed {formatLongDate(printedAt)}</span>
	</footer>
</div>

<style>
	.doc {
		max-width: 760px;
		margin: 2rem auto;
		padding: 2rem;
		background: white;
		color: #111;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 11pt;
		border: 1px solid #ccc;
	}

	.doc-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		border-bottom: 2px solid #111;
		padding-bottom: 0.5rem;
		margin-bottom: 1.25rem;
	}

	.header-society { font-size: 13pt; font-weight: bold; }

	.header-title {
		font-size: 10pt;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #555;
	}

	.assembly-meta {
		display: flex;
		gap: 2rem;
		font-size: 9pt;
		color: #555;
		margin-bottom: 1rem;
	}

	.seats-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10pt;
	}

	.seats-table th {
		font-size: 8pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		text-align: left;
		padding: 0.2rem 0.4rem;
		border-bottom: 1px solid #111;
	}

	.seats-table td {
		padding: 0.25rem 0.4rem;
		border-bottom: 1px solid #e8e8e8;
	}

	.col-seat { width: 3rem; color: #888; text-align: center; }
	.col-name { font-weight: bold; }
	.col-handle { color: #555; font-style: italic; font-size: 9pt; }
	.row-vacant td { color: #ccc; }

	.empty { color: #888; font-style: italic; }

	.doc-footer {
		margin-top: 1rem;
		border-top: 1px solid #ccc;
		padding-top: 0.4rem;
		display: flex;
		justify-content: space-between;
		font-size: 8pt;
		color: #888;
		letter-spacing: 0.03em;
	}

	@media print {
		.doc {
			margin: 0;
			padding: 1.5cm 2cm;
			border: none;
			max-width: none;
		}

		@page { size: letter portrait; margin: 0; }
	}
</style>
