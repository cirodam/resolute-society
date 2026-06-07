import type Database from 'better-sqlite3';

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
	constructor(private readonly database: Database.Database) {}

	findSociety(societyId: string): SocietyRow | null {
		const society = this.database
			.prepare('SELECT id, name FROM society_config WHERE id = ?')
			.get(societyId) as SocietyRow | undefined;

		return society ?? null;
	}

	listCourses(societyId: string, includeUnapproved: boolean): CourseListRow[] {
		const approvalFilter = includeUnapproved ? '' : "AND c.approval_status = 'approved'";

		return this.database
			.prepare(
				`SELECT c.id, c.title, c.description, c.learning_outcomes, c.time_commitment, c.prerequisites,
				        c.schedule, c.type, c.max_students,
				        c.location_type, c.address, c.starts_at, c.ends_at, c.status,
				        c.approval_status, c.approved_by, c.approved_at,
				        p.id as instructor_id, p.given_name, p.surname, p.handle,
				        approver.given_name as approver_given_name, approver.surname as approver_surname,
				        (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled') as enrolled_count
				 FROM course c
				 JOIN person p ON p.id = c.instructor_id
				 LEFT JOIN person approver ON approver.id = c.approved_by
				 WHERE c.society_id = ? ${approvalFilter}
				 ORDER BY c.approval_status, c.starts_at DESC`
			)
			.all(societyId) as CourseListRow[];
	}

	findCourse(societyId: string, courseId: string): CourseDetailRow | null {
		const course = this.database
			.prepare(
				`SELECT c.id, c.society_id, c.title, c.description, c.learning_outcomes, c.time_commitment,
				        c.prerequisites, c.schedule, c.type, c.max_students, c.location_type, c.address,
				        c.starts_at, c.ends_at, c.status, c.approval_status, c.approved_by, c.approved_at,
				        p.id as instructor_id, p.given_name, p.surname, p.handle,
				        approver.given_name as approver_given_name, approver.surname as approver_surname,
				        (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled') as enrolled_count
				 FROM course c
				 JOIN person p ON p.id = c.instructor_id
				 LEFT JOIN person approver ON approver.id = c.approved_by
				 WHERE c.society_id = ? AND c.id = ?`
			)
			.get(societyId, courseId) as CourseDetailRow | undefined;

		return course ?? null;
	}

	findCourseSummary(courseId: string, societyId: string): CourseSummaryRow | null {
		const course = this.database
			.prepare(
				`SELECT c.max_students,
				        (SELECT COUNT(*) FROM course_enrollment WHERE course_id = c.id AND status = 'enrolled') as enrolled_count
				 FROM course c
				 WHERE c.id = ? AND c.society_id = ?`
			)
			.get(courseId, societyId) as CourseSummaryRow | undefined;

		return course ?? null;
	}

	findCourseSociety(courseId: string): CourseSocietyRow | null {
		const course = this.database
			.prepare('SELECT society_id FROM course WHERE id = ?')
			.get(courseId) as CourseSocietyRow | undefined;

		return course ?? null;
	}

	isStudentEnrolled(courseId: string, studentId: string): boolean {
		const existing = this.database
			.prepare('SELECT 1 FROM course_enrollment WHERE course_id = ? AND student_id = ?')
			.get(courseId, studentId);

		return !!existing;
	}

	createEnrollment(courseId: string, studentId: string): void {
		this.database
			.prepare(
				`INSERT INTO course_enrollment (course_id, student_id)
				 VALUES (?, ?)`
			)
			.run(courseId, studentId);
	}

	createCourse(params: CourseCreateParams): void {
		this.database
			.prepare(
				`INSERT INTO course (id, society_id, instructor_id, title, description, learning_outcomes, time_commitment, prerequisites, schedule, type, max_students, location_type, address, starts_at, ends_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				params.courseId,
				params.societyId,
				params.instructorId,
				params.title,
				params.description,
				params.learningOutcomes,
				params.timeCommitment,
				params.prerequisites,
				params.schedule,
				params.type,
				params.maxStudents,
				params.locationType,
				params.address,
				params.startsAt,
				params.endsAt
			);
	}

	approveCourse(courseId: string, societyId: string, approvedBy: string, approvedAt: string): void {
		this.database
			.prepare(
				`UPDATE course
				 SET approval_status = 'approved', approved_by = ?, approved_at = ?
				 WHERE id = ? AND society_id = ?`
			)
			.run(approvedBy, approvedAt, courseId, societyId);
	}

	rejectCourse(courseId: string, societyId: string, approvedBy: string, approvedAt: string): void {
		this.database
			.prepare(
				`UPDATE course
				 SET approval_status = 'rejected', approved_by = ?, approved_at = ?
				 WHERE id = ? AND society_id = ?`
			)
			.run(approvedBy, approvedAt, courseId, societyId);
	}
}
