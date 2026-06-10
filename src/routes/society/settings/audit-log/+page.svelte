<script lang="ts">
	import { formatDateTime } from '$lib/client/datetime';
	import type { PageData } from './$types';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data }: { data: PageData } = $props();

	let expandedId = $state<string | null>(null);

	function toggle(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function parseMetadata(json: string): Record<string, unknown> | null {
		try {
			const parsed = JSON.parse(json);
			if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
				return parsed;
			}
		} catch {
			// ignore
		}
		return null;
	}
</script>

{#if data.events.length === 0}
	<EmptyState message="No audit events recorded yet." card />
{:else}
	<div class="audit-table card-border">
		<div class="audit-header">
			<div>Time</div>
			<div>Actor</div>
			<div>Event</div>
			<div>Summary</div>
			<div></div>
		</div>
		{#each data.events as event}
			{@const meta = parseMetadata(event.metadata_json)}
			<div class="audit-row" class:audit-row--expanded={expandedId === event.id}>
				<div class="audit-cell audit-cell--time">{formatDateTime(event.occurred_at)}</div>
				<div class="audit-cell audit-cell--actor">{event.actor_display}</div>
				<div class="audit-cell audit-cell--type">
					<span class="event-type">{event.event_type}</span>
				</div>
				<div class="audit-cell audit-cell--summary">{event.summary}</div>
				<div class="audit-cell audit-cell--toggle">
					{#if meta}
						<button class="toggle-btn" onclick={() => toggle(event.id)}>
							{expandedId === event.id ? 'Hide' : 'Details'}
						</button>
					{/if}
				</div>
				{#if expandedId === event.id && meta}
					<div class="audit-meta">
						<table class="meta-table">
							{#each Object.entries(meta) as [key, value]}
								<tr>
									<td class="meta-key">{key}</td>
									<td class="meta-value">
										{#if value !== null && typeof value === 'object'}
											<pre class="meta-json">{JSON.stringify(value, null, 2)}</pre>
										{:else}
											{String(value ?? '—')}
										{/if}
									</td>
								</tr>
							{/each}
						</table>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.audit-table {
		overflow: hidden;
	}

	.audit-header {
		display: grid;
		grid-template-columns: 10rem 12rem 14rem 1fr 5rem;
		gap: 0;
		padding: var(--space-2) var(--space-4);
		background: var(--tint-green-mid);
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-label);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--ink-mid);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.audit-row {
		display: grid;
		grid-template-columns: 10rem 12rem 14rem 1fr 5rem;
		align-items: center;
		border-bottom: 1px solid var(--border-faint);
		transition: background 0.1s;
	}

	.audit-row:last-child {
		border-bottom: none;
	}

	.audit-row:hover {
		background: var(--tint-gold);
	}

	.audit-row--expanded {
		grid-template-columns: 10rem 12rem 14rem 1fr 5rem;
		grid-template-rows: auto auto;
		background: var(--tint-gold);
	}

	.audit-cell {
		padding: var(--space-3) var(--space-4);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.audit-cell--time {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		white-space: nowrap;
	}

	.audit-cell--actor {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.audit-cell--summary {
		color: var(--ink-base);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.audit-cell--toggle {
		text-align: right;
	}

	.event-type {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--gold);
		background: var(--tint-gold);
		padding: 2px var(--space-2);
		border: 1px solid var(--border-faint);
	}

	.toggle-btn {
		font-family: var(--font-label);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		background: none;
		border: 1px solid var(--border-subtle);
		padding: 2px var(--space-2);
		cursor: pointer;
	}

	.toggle-btn:hover {
		border-color: var(--border-strong);
		color: var(--ink-base);
	}

	.audit-meta {
		grid-column: 1 / -1;
		padding: var(--space-3) var(--space-4) var(--space-4);
		border-top: 1px solid var(--border-faint);
		background: var(--surface-base);
	}

	.meta-table {
		border-collapse: collapse;
		font-size: var(--text-xs);
		font-family: var(--font-mono);
		width: 100%;
	}

	.meta-table tr {
		vertical-align: top;
	}

	.meta-key {
		color: var(--ink-mid);
		padding: 2px var(--space-3) 2px 0;
		white-space: nowrap;
		width: 12rem;
	}

	.meta-value {
		color: var(--ink-base);
		padding: 2px 0;
	}

	.meta-json {
		margin: 0;
		font-size: var(--text-xs);
		white-space: pre-wrap;
		word-break: break-word;
	}
</style>
