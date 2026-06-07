import { randomUUID } from 'crypto';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission, hasPermission } from '$lib/server/services/auth.service';
import { error, fail } from '@sveltejs/kit';
import { getRepositories } from '$lib/server/infra/repositories';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const society = await repositories.courses.findSociety(resolveSocietyId(undefined));

	if (!society) {
		throw error(404, 'Society not found');
	}

	const canApprove = locals.person
		? await hasPermission({
			personId: locals.person.id,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'education.approve_course'
		})
		: false;

	const courses = await repositories.courses.listCourses(resolveSocietyId(undefined), canApprove);

	return {
		society,
		courses,
		canApprove
	};
};

export const actions: Actions = {
	createCourse: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { message: 'Not authenticated' });
		}

		const repositories = getRepositories();

		const formData = await request.formData();
		const title = formData.get('title')?.toString();
		const description = formData.get('description')?.toString();
		const learningOutcomes = formData.get('learning_outcomes')?.toString() || null;
		const timeCommitment = formData.get('time_commitment')?.toString() || null;
		const prerequisites = formData.get('prerequisites')?.toString() || null;
		const schedule = formData.get('schedule')?.toString();
		const type = formData.get('type') as 'classroom' | 'tutoring';
		const maxStudentsStr = formData.get('max_students')?.toString();
		const locationType = formData.get('location_type') as 'in_person' | 'online';
		const address = formData.get('address')?.toString() || null;
		const startsAt = formData.get('starts_at')?.toString();
		const endsAt = formData.get('ends_at')?.toString();

		if (!title || !description || !schedule || !type || !locationType || !startsAt || !endsAt) {
			return fail(400, { message: 'All required fields must be filled' });
		}

		const maxStudents = type === 'tutoring' ? 1 : maxStudentsStr ? parseInt(maxStudentsStr) : null;

		await repositories.courses.createCourse({
			societyId: resolveSocietyId(undefined),
			instructorId: locals.person.id,
			title,
			description,
			learningOutcomes,
			timeCommitment,
			prerequisites,
			schedule,
			type,
			maxStudents,
			locationType,
			address,
			startsAt,
			endsAt,
			courseId: randomUUID()
		});

		return { success: true };
	},
	enroll: async ({ request, params, locals }) => {
		if (!locals.person) {
			return fail(401, { message: 'Not authenticated' });
		}

		const formData = await request.formData();
		const courseId = formData.get('course_id')?.toString();

		if (!courseId) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = await repositories.courses.findCourseSummary(courseId, resolveSocietyId(undefined));

		if (!course) {
			return fail(404, { message: 'Course not found' });
		}

		if (await repositories.courses.isStudentEnrolled(courseId, locals.person.id)) {
			return fail(400, { message: 'Already enrolled' });
		}

		if (course.max_students !== null && course.enrolled_count >= course.max_students) {
			return fail(400, { message: 'Course is full' });
		}

		await repositories.courses.createEnrollment(courseId, locals.person.id);

		return { success: true };
	},
	approveCourse: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'education.approve_course', resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const formData = await request.formData();
		const courseId = formData.get('course_id')?.toString();

		if (!courseId) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = await repositories.courses.findCourseSociety(courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		await repositories.courses.approveCourse(courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		return { success: true };
	},
	rejectCourse: async (event) => {
		const { request, params, locals } = event;
		await requirePermission(event, 'education.approve_course', resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const formData = await request.formData();
		const courseId = formData.get('course_id')?.toString();

		if (!courseId) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = await repositories.courses.findCourseSociety(courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		await repositories.courses.rejectCourse(courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		return { success: true };
	}
};
