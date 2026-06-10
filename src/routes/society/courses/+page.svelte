<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { formatDateRange, formatShortDate } from '$lib/client/datetime';
	import { activitiesTabs } from '$lib/client/navigation';
	import Subnav from '$lib/components/Subnav.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data }: { data: PageData } = $props();

	let showCourseForm = $state(false);

	function getEnrollmentStatus(enrolled: number, max: number | null) {
		if (max === null) return `${enrolled} enrolled`;
		return `${enrolled} / ${max} enrolled`;
	}

	function trimDescription(description: string) {
		if (description.length <= 180) return description;
		return `${description.slice(0, 177)}...`;
	}

	const pendingCourses = $derived(
		data.canApprove ? data.courses.filter((course) => course.approval_status === 'pending') : []
	);

	const publishedCourses = $derived(
		data.courses.filter((course) => course.approval_status !== 'pending')
	);
</script>

<div class="page-container">
	<div class="page-header">
		<h1 class="t-display">Courses</h1>
		<p class="page-header-description">
			Educational courses offered in {data.society.name}
		</p>
	</div>

	<Subnav tabs={activitiesTabs} />

	<div class="page-content">
		<section class="courses-section">
			<div class="section-header">
				<h2 class="section-title">Courses</h2>
				<div class="header-actions">
					<a href="/society/courses/print" class="btn btn--secondary btn--small">Print</a>
					<button class="btn btn--secondary btn--small" onclick={() => showCourseForm = !showCourseForm}>
						{showCourseForm ? 'Cancel' : '+ Offer Course'}
					</button>
				</div>
			</div>

			{#if showCourseForm}
				<form method="POST" action="?/createCourse" use:enhance class="course-form card-border">
					<div class="form-group">
						<label for="course-title">Course Title</label>
						<input type="text" id="course-title" name="title" required class="input" />
					</div>
					<div class="form-group">
						<label for="course-description">Description</label>
						<textarea id="course-description" name="description" required class="textarea" rows="4"></textarea>
					</div>
					<div class="form-group">
						<label for="course-learning-outcomes">Learning Outcomes</label>
						<textarea id="course-learning-outcomes" name="learning_outcomes" class="textarea" rows="3" placeholder="What will students be able to do after completing this course?"></textarea>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="course-time-commitment">Time Commitment</label>
							<input type="text" id="course-time-commitment" name="time_commitment" class="input" placeholder="e.g., 3-5 hours per week" />
						</div>
						<div class="form-group">
							<label for="course-prerequisites">Prerequisites</label>
							<input type="text" id="course-prerequisites" name="prerequisites" class="input" placeholder="e.g., Basic algebra" />
						</div>
					</div>
					<div class="form-group">
						<label for="course-schedule">Schedule</label>
						<input type="text" id="course-schedule" name="schedule" required class="input" placeholder="e.g., Mondays & Wednesdays 3-5pm" />
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="course-type">Type</label>
							<select id="course-type" name="type" required class="select">
								<option value="classroom">Classroom (1-to-many)</option>
								<option value="tutoring">Tutoring (1-to-1)</option>
							</select>
						</div>
						<div class="form-group">
							<label for="course-max-students">Max Students</label>
							<input type="number" id="course-max-students" name="max_students" class="input" placeholder="Leave empty for unlimited" />
							<small>Tutoring always limited to 1 student</small>
						</div>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="course-location-type">Location</label>
							<select id="course-location-type" name="location_type" required class="select">
								<option value="in_person">In Person</option>
								<option value="online">Online</option>
							</select>
						</div>
						<div class="form-group">
							<label for="course-address">Address</label>
							<input type="text" id="course-address" name="address" class="input" placeholder="Required for in-person" />
						</div>
					</div>
					<div class="form-row">
						<div class="form-group">
							<label for="course-starts-at">Starts</label>
							<input type="date" id="course-starts-at" name="starts_at" required class="input" />
						</div>
						<div class="form-group">
							<label for="course-ends-at">Ends</label>
							<input type="date" id="course-ends-at" name="ends_at" required class="input" />
						</div>
					</div>
					<button type="submit" class="btn btn--primary">Create Course</button>
				</form>
			{/if}

			{#if data.courses.length === 0 && !showCourseForm}
				<EmptyState message="No courses offered yet." />
			{:else if !showCourseForm}
				{#if data.canApprove && pendingCourses.length > 0}
					<div class="pending-section">
						<h3 class="subsection-title t-prose">Pending Approval</h3>
						<div class="courses-grid">
							{#each pendingCourses as course}
								<div class="course-card card-border">
									<div class="course-header">
										<h4 class="course-title">{course.title}</h4>
										<div class="course-meta">
											<span class="course-type t-label">{course.type === 'classroom' ? 'Classroom' : 'Tutoring'}</span>
											<span class="course-location t-label">
												{course.location_type === 'online' ? 'Online' : 'In Person'}
											</span>
										</div>
									</div>

									<p class="course-description">{trimDescription(course.description)}</p>

									<div class="course-details">
										<div class="detail-item">
											<span class="detail-label">Duration</span>
											<span class="detail-value">{formatDateRange(course.starts_at, course.ends_at, formatShortDate)}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Instructor</span>
											<a href="/person/{course.instructor_id}" class="detail-link">
												{course.given_name} {course.surname}
											</a>
										</div>
										<div class="detail-item">
											<span class="detail-label">Enrollment</span>
											<span class="detail-value">{getEnrollmentStatus(course.enrolled_count, course.max_students)}</span>
										</div>
									</div>

									<a href="/society/courses/{course.id}" class="btn btn--primary btn--small view-link">
										View details
									</a>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if publishedCourses.length > 0}
					<div class="published-section">
						<h3 class="subsection-title t-prose">Published Courses</h3>
						<div class="courses-grid">
							{#each publishedCourses as course}
								<div class="course-card card-border">
									<div class="course-header">
										<h4 class="course-title">{course.title}</h4>
										<div class="course-meta">
											<span class="course-type t-label">{course.type === 'classroom' ? 'Classroom' : 'Tutoring'}</span>
											<span class="course-location t-label">
												{course.location_type === 'online' ? 'Online' : 'In Person'}
											</span>
										</div>
									</div>

									<p class="course-description">{trimDescription(course.description)}</p>

									<div class="course-details">
										<div class="detail-item">
											<span class="detail-label">Duration</span>
											<span class="detail-value">{formatDateRange(course.starts_at, course.ends_at, formatShortDate)}</span>
										</div>
										<div class="detail-item">
											<span class="detail-label">Instructor</span>
											<a href="/person/{course.instructor_id}" class="detail-link">
												{course.given_name} {course.surname}
											</a>
										</div>
										<div class="detail-item">
											<span class="detail-label">Enrollment</span>
											<span class="detail-value">{getEnrollmentStatus(course.enrolled_count, course.max_students)}</span>
										</div>
									</div>

									<a href="/society/courses/{course.id}" class="btn btn--primary btn--small view-link">
										View details
									</a>
								</div>
							{/each}
						</div>
					</div>
				{:else if data.canApprove}
					<EmptyState message="No published courses yet." />
				{/if}
			{/if}
		</section>
	</div>
</div>

<style>
	.courses-section {
		margin-bottom: var(--space-10);
	}

	/* btn--small has extra white-space: nowrap here */
	.btn--small {
		white-space: nowrap;
	}

	.course-form {
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

	.form-group small {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-3);
	}

	.input,
	.select,
	.textarea {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-prose);
		font-size: var(--text-sm);
	}

	.textarea {
		resize: vertical;
	}

	.courses-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: var(--space-5);
	}

	.pending-section,
	.published-section {
		margin-bottom: var(--space-6);
	}

	.subsection-title {
		font-weight: 600;
		margin: 0 0 var(--space-3) 0;
	}

	.course-card {
		padding: var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		background: var(--surface);
	}

	.course-header {
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--border-faint);
	}

	.course-title {
		font-family: var(--font-prose);
		font-size: var(--text-lg);
		font-weight: 600;
		margin: 0 0 var(--space-2) 0;
	}

	.course-meta {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-top: var(--space-2);
	}

	.course-type,
	.course-location {
		font-size: var(--text-xs);
		color: var(--ink-mid);
		padding: var(--space-1) var(--space-2);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.course-description {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		color: var(--ink-mid);
		margin: 0;
		line-height: 1.5;
	}

	.course-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: var(--tint-green);
		border: 1px solid var(--border-faint);
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.detail-label {
		font-family: var(--font-prose);
		font-size: var(--text-xs);
		color: var(--ink-mid);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-value {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	.detail-link {
		font-family: var(--font-prose);
		font-size: var(--text-sm);
		font-weight: 600;
		text-decoration: none;
		color: inherit;
	}

	.detail-link:hover {
		color: var(--gold);
	}

	.view-link {
		align-self: flex-start;
		margin-top: var(--space-2);
	}

</style>
