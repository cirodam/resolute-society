import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission, hasPermission } from '$lib/server/services/auth.service';
import { getRepositories } from '$lib/server/infra/repositories';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const course = repositories.courses.findCourse(resolveSocietyId(undefined), params.courseId);

	if (!course) {
		throw error(404, 'Course not found');
	}

	const canApprove = locals.person
		? hasPermission({
			personId: locals.person.id,
			societyId: resolveSocietyId(undefined),
			permissionCode: 'education.approve_course'
		})
		: false;

	if (!canApprove && course.approval_status !== 'approved') {
		throw error(404, 'Course not found');
	}

	return {
		course,
		societyId: resolveSocietyId(undefined),
		canApprove
	};
};

export const actions: Actions = {
	enroll: async ({ params, locals }) => {
		if (!locals.person) {
			return fail(401, { message: 'Not authenticated' });
		}

		const repositories = getRepositories();
		const course = repositories.courses.findCourseSummary(params.courseId, resolveSocietyId(undefined));

		if (!course) {
			return fail(404, { message: 'Course not found' });
		}

		if (repositories.courses.isStudentEnrolled(params.courseId, locals.person.id)) {
			return fail(400, { message: 'Already enrolled' });
		}

		if (course.max_students !== null && course.enrolled_count >= course.max_students) {
			return fail(400, { message: 'Course is full' });
		}

		repositories.courses.createEnrollment(params.courseId, locals.person.id);

		return { success: true };
	},
	approveCourse: async (event) => {
		const { params, locals } = event;
		requirePermission(event, 'education.approve_course', resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = repositories.courses.findCourseSociety(params.courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		repositories.courses.approveCourse(params.courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		return { success: true };
	},
	rejectCourse: async (event) => {
		const { params, locals } = event;
		requirePermission(event, 'education.approve_course', resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = repositories.courses.findCourseSociety(params.courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		repositories.courses.rejectCourse(params.courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		return { success: true };
	}
};
