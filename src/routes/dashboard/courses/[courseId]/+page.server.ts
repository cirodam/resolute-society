import { PERMISSION } from '$lib/permissions';
import { error, fail } from '@sveltejs/kit';
import { resolveSocietyId } from '$lib/server/utils/society-id.util';
import { requirePermission } from '$lib/server/services/auth.service';
import { getRepositories } from '$lib/server/infra/repositories';
import { audit } from '$lib/server/services/audit.service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const repositories = getRepositories();
	const course = await repositories.courses.findCourse(resolveSocietyId(undefined), params.courseId);

	if (!course) {
		throw error(404, 'Course not found');
	}

	const canApprove = locals.person
		? await getRepositories().permissions.hasPermission({
			personId: locals.person.id,
			societyId: resolveSocietyId(undefined),
			permissionCode: PERMISSION.EDUCATION_APPROVE_COURSE
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
		const course = await repositories.courses.findCourseSummary(params.courseId, resolveSocietyId(undefined));

		if (!course) {
			return fail(404, { message: 'Course not found' });
		}

		if (await repositories.courses.isStudentEnrolled(params.courseId, locals.person.id)) {
			return fail(400, { message: 'Already enrolled' });
		}

		if (course.max_students !== null && course.enrolled_count >= course.max_students) {
			return fail(400, { message: 'Course is full' });
		}

		await repositories.courses.createEnrollment(params.courseId, locals.person.id);

		return { success: true };
	},
	approveCourse: async (event) => {
		const { params, locals } = event;
		await requirePermission(event, PERMISSION.EDUCATION_APPROVE_COURSE, resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = await repositories.courses.findCourseSociety(params.courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		await repositories.courses.approveCourse(params.courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'COURSE_APPROVED',
			targetType: 'course',
			targetId: params.courseId,
			summary: `Course approved`,
			metadata: { courseId: params.courseId }
		});

		return { success: true };
	},
	rejectCourse: async (event) => {
		const { params, locals } = event;
		await requirePermission(event, PERMISSION.EDUCATION_APPROVE_COURSE, resolveSocietyId(undefined));

		if (!locals.person) {
			return fail(400, { message: 'Invalid request' });
		}

		const repositories = getRepositories();
		const course = await repositories.courses.findCourseSociety(params.courseId);

		if (!course || course.society_id !== resolveSocietyId(undefined)) {
			return fail(404, { message: 'Course not found' });
		}

		await repositories.courses.rejectCourse(params.courseId, resolveSocietyId(undefined), locals.person.id, new Date().toISOString());

		await audit({
			actor: locals.person,
			societyId: resolveSocietyId(undefined),
			eventType: 'COURSE_REJECTED',
			targetType: 'course',
			targetId: params.courseId,
			summary: `Course rejected`,
			metadata: { courseId: params.courseId }
		});

		return { success: true };
	}
};
