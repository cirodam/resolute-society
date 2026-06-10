<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, positions, printedAt } = $derived(data);

	const filled = $derived(positions.filter((p) => p.current_person_id));
	const vacant = $derived(positions.filter((p) => !p.current_person_id));
</script>

<PrintToolbar backHref="/society/officers" backLabel="← Officers" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Officer Roster</div>
	</header>

	{#if positions.length === 0}
		<p class="empty">No officer positions defined.</p>
	{:else}
		<table class="officers-table">
			<thead>
				<tr>
					<th>Position</th>
					<th>Officer</th>
					<th>Term</th>
				</tr>
			</thead>
			<tbody>
				{#each filled as pos}
					<tr>
						<td class="col-position">
							<span class="position-name">{pos.name}</span>
							{#if pos.description}<span class="position-desc">{pos.description}</span>{/if}
						</td>
						<td class="col-officer">{pos.given_name} {pos.surname}</td>
						<td class="col-term">{pos.term_limit_years}y</td>
					</tr>
				{/each}
				{#each vacant as pos}
					<tr class="row-vacant">
						<td class="col-position">
							<span class="position-name">{pos.name}</span>
							{#if pos.description}<span class="position-desc">{pos.description}</span>{/if}
						</td>
						<td class="col-officer vacant-label">Vacant</td>
						<td class="col-term">{pos.term_limit_years}y</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<footer class="doc-footer">
		<span>{filled.length} filled · {vacant.length} vacant · {society.name}</span>
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

	.officers-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10pt;
	}

	.officers-table th {
		font-size: 8pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		text-align: left;
		padding: 0.2rem 0.4rem;
		border-bottom: 1px solid #111;
	}

	.officers-table td {
		padding: 0.4rem 0.4rem;
		border-bottom: 1px solid #e8e8e8;
		vertical-align: top;
	}

	.position-name { font-weight: bold; display: block; }

	.position-desc {
		display: block;
		font-size: 9pt;
		color: #666;
		font-style: italic;
	}

	.col-officer { font-weight: bold; }
	.col-term { text-align: center; width: 4rem; color: #888; font-size: 9pt; }

	.row-vacant td { color: #aaa; }
	.vacant-label { font-style: italic; }

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
