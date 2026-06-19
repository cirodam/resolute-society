<script lang="ts">
	import PrintToolbar from '$lib/components/PrintToolbar.svelte';
	import { formatLongDate, formatShortDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { society, courses, printedAt } = $derived(data);

	const approved = $derived(courses.filter((c) => c.approval_status === 'approved'));
</script>

<PrintToolbar backHref="/dashboard/courses" backLabel="← Courses" />

<div class="doc">
	<header class="doc-header">
		<div class="header-society">{society.name}</div>
		<div class="header-title">Course Listings</div>
	</header>

	{#if approved.length === 0}
		<p class="empty">No approved courses.</p>
	{:else}
		<div class="course-list">
			{#each approved as course}
				<div class="course-row">
					<div class="course-header">
						<span class="course-title">{course.title}</span>
						<span class="course-type">{course.type}</span>
					</div>
					<div class="course-meta">
						<span>Instructor: {course.given_name} {course.surname}</span>
						<span>{formatShortDate(course.starts_at)} – {formatShortDate(course.ends_at)}</span>
						{#if course.max_students}
							<span>{course.enrolled_count}/{course.max_students} enrolled</span>
						{:else}
							<span>{course.enrolled_count} enrolled</span>
						{/if}
						<span>{course.location_type === 'in_person' ? (course.address ?? 'In person') : 'Online'}</span>
					</div>
					{#if course.schedule}
						<div class="course-schedule">{course.schedule}</div>
					{/if}
					{#if course.description}
						<div class="course-desc">{course.description}</div>
					{/if}
					{#if course.prerequisites}
						<div class="course-prereq">Prerequisites: {course.prerequisites}</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	<footer class="doc-footer">
		<span>{approved.length} courses · {society.name}</span>
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

	.course-list { display: flex; flex-direction: column; }

	.course-row {
		padding: 0.6rem 0;
		border-bottom: 1px solid #e8e8e8;
	}

	.course-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
		margin-bottom: 0.2rem;
	}

	.course-title { font-weight: bold; font-size: 12pt; }

	.course-type {
		font-size: 8pt;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #888;
		border: 1px solid #ccc;
		padding: 0.05rem 0.3rem;
	}

	.course-meta {
		font-size: 9pt;
		color: #555;
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem 1.5rem;
	}

	.course-schedule {
		font-size: 9pt;
		color: #444;
		margin-top: 0.2rem;
	}

	.course-desc {
		font-size: 9pt;
		color: #444;
		margin-top: 0.2rem;
		font-style: italic;
	}

	.course-prereq {
		font-size: 9pt;
		color: #666;
		margin-top: 0.15rem;
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
