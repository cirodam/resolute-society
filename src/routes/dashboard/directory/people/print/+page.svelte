<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, members, printedAt } = $derived(data);
</script>

<PrintToolbar backHref="/dashboard/directory/people" backLabel="← Directory" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Membership Roster</div>
	</header>

	<table class="roster-table">
		<thead>
			<tr>
				<th>#</th>
				<th>Name</th>
				<th>Handle</th>
				<th>Status</th>
				<th>Sortition</th>
			</tr>
		</thead>
		<tbody>
			{#each members as member, i}
				<tr>
					<td class="col-num">{i + 1}</td>
					<td class="col-name">{member.given_name} {member.surname}</td>
					<td class="col-handle">{member.handle}</td>
					<td class="col-status">{member.membership_status}</td>
					<td class="col-sortition">{member.sortition_number ?? '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<footer class="doc-footer">
		<span>{members.length} members · {society.name}</span>
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

	.roster-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10pt;
	}

	.roster-table th {
		font-size: 8pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		text-align: left;
		padding: 0.2rem 0.4rem;
		border-bottom: 1px solid #111;
	}

	.roster-table td {
		padding: 0.25rem 0.4rem;
		border-bottom: 1px solid #e8e8e8;
		vertical-align: baseline;
	}

	.roster-table tbody tr:nth-child(even) td {
		background: #f9f9f9;
	}

	.col-num { color: #888; width: 2rem; }
	.col-name { font-weight: bold; }
	.col-handle { color: #555; font-style: italic; }
	.col-status { font-size: 9pt; }
	.col-sortition { text-align: center; width: 5rem; }

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
