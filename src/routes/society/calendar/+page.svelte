<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { formatTime, formatWeekdayDate } from '$lib/client/datetime';
	import { activitiesTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';
	import Alert from '$lib/components/Alert.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showEventForm = $state(false);

	const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	function monthLabel(year: number, month: number) {
		return `${MONTH_NAMES[month - 1]} ${year}`;
	}

	function prevHref(year: number, month: number) {
		const d = new Date(year, month - 2, 1);
		return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;
	}

	function nextHref(year: number, month: number) {
		const d = new Date(year, month, 1);
		return `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;
	}
</script>

<div class="page-container page-container--content">
	<div class="page-header">
		<div class="section-header">
			<div>
				<h1 class="t-display">Calendar</h1>
				<p class="page-header-description">
					Events and gatherings for {data.society.name}
				</p>
			</div>
			<div class="header-actions">
				<a href="/society/calendar/print" class="btn btn--secondary btn--small">Print</a>
				<button class="btn btn--secondary btn--small" onclick={() => showEventForm = !showEventForm}>
					{showEventForm ? 'Cancel' : '+ Add Event'}
				</button>
			</div>
		</div>
	</div>

	<Subnav tabs={activitiesTabs} />

	<div class="month-nav">
		<a href={prevHref(data.year, data.month)} class="month-nav__arrow">←</a>
		<span class="month-nav__label t-label">{monthLabel(data.year, data.month)}</span>
		<a href={nextHref(data.year, data.month)} class="month-nav__arrow">→</a>
	</div>

	<Alert type="success" message={form?.success ? 'Event created successfully' : null} />
	<Alert type="error" message={form?.error} />

	{#if showEventForm}
		<form method="POST" action="?/createEvent" use:enhance class="event-form card-border">
			<div class="form-group">
				<label for="event-title">Title</label>
				<input type="text" id="event-title" name="title" required class="input" />
			</div>

			<div class="form-group">
				<label for="event-description">Description</label>
				<textarea id="event-description" name="description" class="textarea" rows="3"></textarea>
			</div>

			<div class="form-group">
				<label for="event-location">Location</label>
				<input type="text" id="event-location" name="location" class="input" />
			</div>

			<div class="form-row">
				<div class="form-group">
					<label for="event-starts">Start Date & Time</label>
					<input type="datetime-local" id="event-starts" name="starts_at" required class="input" />
				</div>

				<div class="form-group">
					<label for="event-ends">End Date & Time</label>
					<input type="datetime-local" id="event-ends" name="ends_at" class="input" />
				</div>
			</div>

			{#if data.associations.length > 0}
				<div class="form-group">
					<label for="event-association">Association</label>
					<select id="event-association" name="association_id" class="input">
						<option value="">None (Society-wide)</option>
						{#each data.associations as association}
							<option value={association.id}>{association.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<button type="submit" class="btn btn--primary">Create Event</button>
		</form>
	{/if}

	<div class="page-content">
		{#if data.events.length === 0}
			<EmptyState message="No events in {monthLabel(data.year, data.month)}." />
		{:else}
			<div class="events-list">
				{#each data.events as event}
					<div class="event-card card-border">
						<div class="event-header">
							<div class="event-date">
								<div class="date-day">{formatWeekdayDate(event.starts_at)}</div>
								<div class="date-time">{formatTime(event.starts_at)}</div>
							</div>
							<div class="event-main">
								<h3 class="event-title">{event.title}</h3>

								<div class="event-meta">
									{#if event.location}
										<span class="meta-item">
											📍 {event.location}
										</span>
									{/if}
									{#if event.association_name}
										<span class="meta-item t-label">
											{event.association_name}
										</span>
									{/if}
								</div>

								{#if event.description}
									<p class="event-description">{event.description}</p>
								{/if}

								<div class="event-footer">
									<span class="creator-label">Created by {event.creator_given_name} {event.creator_surname}</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		background: var(--surface);
		border: 1px solid var(--border-subtle);
		margin-bottom: var(--space-4);
	}

	.month-nav__label {
		font-size: var(--text-sm);
		letter-spacing: 0.12em;
		color: var(--ink);
	}

	.month-nav__arrow {
		font-size: var(--text-lg);
		color: var(--ink-mid);
		padding: 0 var(--space-3);
		text-decoration: none;
	}

	.month-nav__arrow:hover { color: var(--ink); }

	.event-form {
		padding: var(--space-5);
		margin-bottom: var(--space-6);
		background: var(--surface);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-group label {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
	}

	.input,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		border: 1px solid var(--border);
		background: var(--paper);
		color: var(--ink);
	}

	.input:focus,
	.textarea:focus {
		outline: none;
		border-color: var(--border-strong);
	}

	.textarea {
		resize: vertical;
	}

	.events-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.event-card {
		padding: var(--space-5);
	}

	.event-header {
		display: flex;
		gap: var(--space-4);
	}

	.event-date {
		flex-shrink: 0;
		width: 120px;
		padding: var(--space-3);
		background: var(--tint-green);
		border: 1px solid var(--border-subtle);
		text-align: center;
	}

	.date-day {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--ink);
		margin-bottom: var(--space-1);
	}

	.date-time {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.event-main {
		flex: 1;
		min-width: 0;
	}

	.event-title {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-2) 0;
		color: var(--ink);
	}

	.event-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.meta-item {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.meta-item.t-label {
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.event-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink);
		line-height: 1.6;
		margin: 0 0 var(--space-3) 0;
	}

	.event-footer {
		border-top: 1px solid var(--border-subtle);
		padding-top: var(--space-2);
	}

	.creator-label {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-faint);
	}
</style>
