<script lang="ts">
	import { formatShortDate, formatLongDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, person, age, associations, dependants, printedAt } = $derived(data);

	const NOTES_LINES = 12;
</script>

<div class="toolbar no-print">
	<a href="/person/{person.id}" class="back-link">← Profile</a>
	<button onclick={() => window.print()} class="print-btn">Print Record</button>
</div>

<div class="member-page">
	<header class="page-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Member Record</div>
	</header>

	<div class="identity-block">
		<div class="name-row">
			<span class="full-name">{person.given_name} {person.surname}</span>
			<span class="handle">@{person.handle}</span>
		</div>
		<div class="detail-grid">
			<div class="detail-item">
				<span class="detail-label">Date of Birth</span>
				<span class="detail-value">{formatShortDate(person.dob, '—')}{person.dob ? ` (${age} yrs)` : ''}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Sex</span>
				<span class="detail-value">{person.sex ?? '—'}</span>
			</div>
			<div class="detail-item">
				<span class="detail-label">Status</span>
				<span class="detail-value">{person.membership_status}</span>
			</div>
			{#if person.sortition_number}
				<div class="detail-item">
					<span class="detail-label">Sortition #</span>
					<span class="detail-value">{person.sortition_number}</span>
				</div>
			{/if}
			{#if person.location_name}
				<div class="detail-item">
					<span class="detail-label">Location</span>
					<span class="detail-value">{person.location_name}</span>
				</div>
			{/if}
		</div>
	</div>

	{#if associations.length > 0}
		<div class="section">
			<div class="section-label">Associations</div>
			<div class="assoc-list">
				{#each associations as assoc}
					<span class="assoc-tag">{assoc.name}</span>
				{/each}
			</div>
		</div>
	{/if}

	{#if dependants.length > 0}
		<div class="section">
			<div class="section-label">Dependants</div>
			{#each dependants as dep}
				<div class="list-row">
					<span class="detail-value">{dep.sex ?? '—'}</span>
					<span class="detail-label">b. {formatShortDate(dep.dob)}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if person.bio}
		<div class="section">
			<div class="section-label">Bio</div>
			<div class="bio-text">{person.bio}</div>
		</div>
	{/if}

	<div class="notes-section">
		<div class="section-label">Notes</div>
		{#each Array(NOTES_LINES) as _}
			<div class="notes-line"></div>
		{/each}
	</div>

	<footer class="page-footer">
		<span>{person.given_name} {person.surname} · {society.name}</span>
		<span>Printed {formatLongDate(printedAt)}</span>
	</footer>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--border);
		background: var(--surface-dk);
	}

	.back-link {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: var(--ink-mid);
		text-decoration: none;
	}

	.print-btn {
		font-family: var(--font-label);
		font-size: var(--text-sm);
		letter-spacing: 0.04em;
		text-transform: lowercase;
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--ink);
		cursor: pointer;
	}

	.member-page {
		max-width: 760px;
		margin: 2rem auto;
		padding: 2rem;
		background: white;
		color: #111;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 11pt;
		border: 1px solid #ccc;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		border-bottom: 2px solid #111;
		padding-bottom: 0.5rem;
		margin-bottom: 1rem;
	}

	.header-society {
		font-size: 13pt;
		font-weight: bold;
	}

	.header-title {
		font-size: 10pt;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #555;
	}

	.identity-block {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #888;
	}

	.name-row {
		display: flex;
		align-items: baseline;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.full-name {
		font-size: 15pt;
		font-weight: bold;
		letter-spacing: 0.02em;
	}

	.handle {
		font-size: 10pt;
		color: #555;
		font-style: italic;
	}

	.detail-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 2rem;
	}

	.detail-item {
		display: flex;
		gap: 0.4rem;
		align-items: baseline;
		font-size: 10pt;
	}

	.detail-label {
		font-size: 9pt;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: #555;
	}

	.detail-value {
		font-weight: bold;
	}

	.section {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.section-label {
		font-size: 9pt;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #555;
		margin-bottom: 0.3rem;
		display: block;
	}

	.assoc-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.assoc-tag {
		font-size: 9pt;
		border: 1px solid #ccc;
		padding: 0.1rem 0.4rem;
	}

	.list-row {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		padding: 0.15rem 0;
		font-size: 10pt;
	}

	.bio-text {
		font-size: 10pt;
		font-style: italic;
		color: #333;
		line-height: 1.5;
	}

	.notes-section {
		margin-top: 1rem;
	}

	.notes-line {
		border-bottom: 1px solid #ccc;
		height: 1.8rem;
		margin-bottom: 0.1rem;
	}

	.page-footer {
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
		.no-print { display: none !important; }

		.member-page {
			margin: 0;
			padding: 1.5cm 2cm;
			border: none;
			max-width: none;
		}

		@page {
			size: letter portrait;
			margin: 0;
		}
	}
</style>
