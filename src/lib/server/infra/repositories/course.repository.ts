import type postgres from 'postgres';

export interface SocietyRow {
	id: string;
	name: string;
}

export interface CourseListRow {
	id: string;
	title: string;
	description: string;
	learning_outcomes: string | null;
	time_commitment: string | null;
	prerequisites: string | null;
	schedule: string;
	type: 'classroom' | 'tutoring';
	max_students: number | null;
	location_type: 'in_person' | 'online';
	address: string | null;
	starts_at: string;
	ends_at: string;
	status: string;
	approval_status: 'pending' | 'approved' | 'rejected';
	approved_by: string | null;
	approved_at: string | null;
	instructor_id: string;
	given_name: string;
	surname: string;
	handle: string;
	approver_given_name: string | null;
	approver_surname: string | null;
	enrolled_count: number;
}

export interface CourseDetailRow extends CourseListRow {
	society_id: string;
}

export interface CourseSummaryRow {
	max_students: number | null;
	enrolled_count: number;
}

export interface CourseSocietyRow {
	society_id: string;
}

export interface CourseApprovalRow {
	society_id: string;
}

export interface CourseCreateParams {
	societyId: string;
	instructorId: string;
	title: string;
	description: string;
	learningOutcomes: string | null;
	timeCommitment: string | null;
	prerequisites: string | null;
	schedule: string;
	type: 'classroom' | 'tutoring';
	maxStudents: number | null;
	locationType: 'in_person' | 'online';
	address: string | null;
	startsAt: string;
	endsAt: string;
	courseId: string;
}

export class CourseRepository {
	constructor(private readonly sql: postgres.Sql) {}

	async findSociety(societyId: string): Promise<SocietyRow | null> {
		const [row] = await this.sql<SocietyRow[]>`SELECT id, name FROM society_config WHERE id = ${societyId}`;
		return row ?? null;
	}

	async listCourses(societyId: string, includeUnapproved: boolean): Promise<CourseListRow[]> {
		if (includeUnapproved) {
			return await this.sql<CourseListRow[]>`
				SELECT c.id, c.title, c.description, c.learning_outcomes, c.time_commitment, c.prerequisites,
				       c.schedule, c.type, c.max_students,
				       c.location_type, c.address, c.starts_at, c.ends_at, c.status,
				       c.approval_status, c.approved_by, c.approved_at,
				       p.id as instructor_id, p.given_name, p.surname, p.handle,
				       approver.given_name as approver_given_name, approver.surname as approver_surname,
				       (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled')::int as enrolled_count
				FROM course c
				JOIN person p ON p.id = c.instructor_id
				LEFT JOIN person approver ON approver.id = c.approved_by
				WHERE c.society_id = ${societyId}
				ORDER BY c.approval_status, c.starts_at DESC`;
		} else {
			return await this.sql<CourseListRow[]>`
				SELECT c.id, c.title, c.description, c.learning_outcomes, c.time_commitment, c.prerequisites,
				       c.schedule, c.type, c.max_students,
				       c.location_type, c.address, c.starts_at, c.ends_at, c.status,
				       c.approval_status, c.approved_by, c.approved_at,
				       p.id as instructor_id, p.given_name, p.surname, p.handle,
				       approver.given_name as approver_given_name, approver.surname as approver_surname,
				       (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled')::int as enrolled_count
				FROM course c
				JOIN person p ON p.id = c.instructor_id
				LEFT JOIN person approver ON approver.id = c.approved_by
				WHERE c.society_id = ${societyId} AND c.approval_status = 'approved'
				ORDER BY c.approval_status, c.starts_at DESC`;
		}
	}

	async findCourse(societyId: string, courseId: string): Promise<CourseDetailRow | null> {
		const [row] = await this.sql<CourseDetailRow[]>`
			SELECT c.id, c.society_id, c.title, c.description, c.learning_outcomes, c.time_commitment,
			       c.prerequisites, c.schedule, c.type, c.max_students, c.location_type, c.address,
			       c.starts_at, c.ends_at, c.status, c.approval_status, c.approved_by, c.approved_at,
			       p.id as instructor_id, p.given_name, p.surname, p.handle,
			       approver.given_name as approver_given_name, approver.surname as approver_surname,
			       (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled')::int as enrolled_count
			FROM course c
			JOIN person p ON p.id = c.instructor_id
			LEFT JOIN person approver ON approver.id = c.approved_by
			WHERE c.society_id = ${societyId} AND c.id = ${courseId}`;
		return row ?? null;
	}

	async findCourseSummary(courseId: string, societyId: string): Promise<CourseSummaryRow | null> {
		const [row] = await this.sql<CourseSummaryRow[]>`
			SELECT c.max_students,
			       (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled')::int as enrolled_count
			FROM course c
			WHERE c.id = ${courseId} AND c.society_id = ${societyId}`;
		return row ?? null;
	}

	async findCourseSociety(courseId: string): Promise<CourseSocietyRow | null> {
		const [row] = await this.sql<CourseSocietyRow[]>`SELECT society_id FROM course WHERE id = ${courseId}`;
		return row ?? null;
	}

	async isStudentEnrolled(courseId: string, studentId: string): Promise<boolean> {
		const [existing] = await this.sql`
			SELECT 1 FROM course_enrollment WHERE course_id = ${courseId} AND student_id = ${studentId}`;
		return !!existing;
	}

	async createEnrollment(courseId: string, studentId: string): Promise<void> {
		await this.sql`INSERT INTO course_enrollment (course_id, student_id) VALUES (${courseId}, ${studentId})`;
	}

	async createCourse(params: CourseCreateParams): Promise<void> {
		await this.sql`
			INSERT INTO course (id, society_id, instructor_id, title, description, learning_outcomes, time_commitment, prerequisites, schedule, type, max_students, location_type, address, starts_at, ends_at)
			VALUES (${params.courseId}, ${params.societyId}, ${params.instructorId}, ${params.title}, ${params.description}, ${params.learningOutcomes}, ${params.timeCommitment}, ${params.prerequisites}, ${params.schedule}, ${params.type}, ${params.maxStudents}, ${params.locationType}, ${params.address}, ${params.startsAt}, ${params.endsAt})`;
	}

	async approveCourse(courseId: string, societyId: string, approvedBy: string, approvedAt: string): Promise<void> {
		await this.sql`
			UPDATE course
			SET approval_status = 'approved', approved_by = ${approvedBy}, approved_at = ${approvedAt}
			WHERE id = ${courseId} AND society_id = ${societyId}`;
	}

	async rejectCourse(courseId: string, societyId: string, approvedBy: string, approvedAt: string): Promise<void> {
		await this.sql`
			UPDATE course
			SET approval_status = 'rejected', approved_by = ${approvedBy}, approved_at = ${approvedAt}
			WHERE id = ${courseId} AND society_id = ${societyId}`;
	}
}
