<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate, formatDateTime } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, events, printedAt } = $derived(data);
</script>

<PrintToolbar backHref="/society/calendar" backLabel="← Calendar" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Upcoming Events</div>
	</header>

	{#if events.length === 0}
		<p class="empty">No upcoming events.</p>
	{:else}
		<div class="event-list">
			{#each events as event}
				<div class="event-row">
					<div class="event-time">{formatDateTime(event.starts_at)}{event.ends_at ? ` – ${formatDateTime(event.ends_at)}` : ''}</div>
					<div class="event-title">{event.title}</div>
					{#if event.association_name}
						<div class="event-meta">{event.association_name}</div>
					{/if}
					{#if event.location}
						<div class="event-meta">{event.location}</div>
					{/if}
					{#if event.description}
						<div class="event-desc">{event.description}</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<footer class="doc-footer">
		<span>{events.length} events · {society.name}</span>
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

	.event-list { display: flex; flex-direction: column; }

	.event-row {
		padding: 0.5rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.event-time {
		font-size: 9pt;
		color: #555;
		font-family: 'Courier New', monospace;
		margin-bottom: 0.1rem;
	}

	.event-title { font-weight: bold; font-size: 12pt; }

	.event-meta {
		font-size: 9pt;
		color: #666;
		display: inline;
		margin-right: 1rem;
	}

	.event-desc {
		font-size: 9pt;
		color: #444;
		margin-top: 0.25rem;
		font-style: italic;
	}

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
