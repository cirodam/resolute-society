<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDateRange, formatShortDate } from '$lib/client/datetime';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function getEnrollmentStatus(enrolled: number, max: number | null) {
		if (max === null) return `${enrolled} enrolled`;
		return `${enrolled} / ${max} enrolled`;
	}

	function getApprovalStatusLabel(status: 'pending' | 'approved' | 'rejected') {
		if (status === 'pending') return 'Pending Approval';
		if (status === 'approved') return 'Approved';
		return 'Rejected';
	}

	function getApprovalStatusClass(status: 'pending' | 'approved' | 'rejected') {
		if (status === 'pending') return 'status-pending';
		if (status === 'approved') return 'status-approved';
		return 'status-rejected';
	}
</script>

<div class="page-container">
	<nav class="breadcrumbs">
		<a href="/dashboard/courses">← All Courses</a>
	</nav>

	<div class="page-header">
		<h1 class="t-display">{data.course.title}</h1>
		<div class="course-meta">
			<span class="course-type t-label">{data.course.type === 'classroom' ? 'Classroom' : 'Tutoring'}</span>
			<span class="course-location t-label">{data.course.location_type === 'online' ? 'Online' : 'In Person'}</span>
			<span class="approval-status t-label {getApprovalStatusClass(data.course.approval_status)}">
				{getApprovalStatusLabel(data.course.approval_status)}
			</span>
		</div>
	</div>

	<div class="detail-layout">
		<section class="main-content card-border">
			<h2 class="section-title">Overview</h2>
			<p class="course-description">{data.course.description}</p>

			{#if data.course.learning_outcomes}
				<h3 class="subsection-title">What You'll Learn</h3>
				<p class="info-block">{data.course.learning_outcomes}</p>
			{/if}

			{#if data.course.prerequisites}
				<h3 class="subsection-title">Prerequisites</h3>
				<p class="info-block">{data.course.prerequisites}</p>
			{/if}
		</section>

		<aside class="side-content card-border">
			<h2 class="section-title">Details</h2>
			<div class="details-list">
				<div class="detail-item">
					<span class="detail-label">Schedule</span>
					<span class="detail-value">{data.course.schedule}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Dates</span>
					<span class="detail-value">{formatDateRange(data.course.starts_at, data.course.ends_at, formatShortDate)}</span>
				</div>
				<div class="detail-item">
					<span class="detail-label">Instructor</span>
					<a href="/person/{data.course.instructor_id}" class="detail-link">
						{data.course.given_name} {data.course.surname}
					</a>
				</div>
				<div class="detail-item">
					<span class="detail-label">Enrollment</span>
					<span class="detail-value">{getEnrollmentStatus(data.course.enrolled_count, data.course.max_students)}</span>
				</div>
				{#if data.course.time_commitment}
					<div class="detail-item">
						<span class="detail-label">Time Commitment</span>
						<span class="detail-value">{data.course.time_commitment}</span>
					</div>
				{/if}
				{#if data.course.address}
					<div class="detail-item">
						<span class="detail-label">Address</span>
						<span class="detail-value">{data.course.address}</span>
					</div>
				{/if}
			</div>

			{#if data.course.approval_status === 'approved' && data.course.approved_by}
				<p class="approval-info">
					Approved by {data.course.approver_given_name} {data.course.approver_surname}
					{#if data.course.approved_at}
						on {formatShortDate(data.course.approved_at)}
					{/if}
				</p>
			{/if}

			{#if data.canApprove && data.course.approval_status === 'pending'}
				<div class="action-row">
					<form method="POST" action="?/approveCourse" use:enhance>
						<button type="submit" class="btn btn--primary btn--small">Approve</button>
					</form>
					<form method="POST" action="?/rejectCourse" use:enhance>
						<button type="submit" class="btn btn--secondary btn--small">Reject</button>
					</form>
				</div>
			{/if}

			{#if data.course.status === 'open' && data.course.approval_status === 'approved'}
				<form method="POST" action="?/enroll" use:enhance class="enroll-form">
					<button type="submit" class="btn btn--primary">Enroll</button>
				</form>
			{/if}
		</aside>
	</div>
</div>

<style>

	.breadcrumbs {
		margin-bottom: var(--space-4);
	}

	.breadcrumbs a {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		text-decoration: none;
	}

	.breadcrumbs a:hover {
		color: var(--gold);
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.course-meta {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.course-type,
	.course-location {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.approval-status {
		font-weight: 600;
		font-size: var(--text-xs);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-faint);
	}

	.status-pending {
		background: var(--tint-gold);
		color: var(--gold);
	}

	.status-approved {
		background: var(--tint-green);
		color: var(--green, #2d5016);
	}

	.status-rejected {
		background: var(--surface);
		color: var(--danger);
	}

	.detail-layout {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: var(--space-4);
	}

	.main-content,
	.side-content {
		padding: var(--space-5);
		background: var(--surface);
	}

	.subsection-title {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		margin: var(--space-4) 0 var(--space-2) 0;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-mid);
	}

	.course-description,
	.info-block {
		font-family: var(--font-prose);
		font-size: var(--text-base);
		line-height: 1.6;
		margin: 0;
		white-space: pre-line;
	}

	.details-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.detail-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		padding-bottom: var(--space-2);
		border-bottom: 1px solid var(--border-faint);
	}

	.detail-label {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--ink-mid);
	}

	.detail-value,
	.detail-link {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.detail-link {
		text-decoration: none;
		color: inherit;
		font-weight: 600;
	}

	.detail-link:hover {
		color: var(--gold);
	}

	.approval-info {
		margin: var(--space-3) 0 0 0;
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		font-style: italic;
		color: var(--ink-mid);
	}

	.action-row {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.enroll-form {
		margin-top: var(--space-4);
	}

	@media (max-width: 900px) {
		.detail-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
