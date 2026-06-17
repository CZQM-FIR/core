import { Course, User } from '@czqm/common';
import {
	queueCourseEnrollmentEmail,
	type CourseEnrollmentEmailEvent
} from '@czqm/common/notifications';
import { db } from '$lib/db';
import env from '$lib/env';

export async function notifyCourseEnrollmentEmail(
	event: CourseEnrollmentEmailEvent,
	courseId: string,
	studentCid: number
): Promise<void> {
	const [course, student] = await Promise.all([
		Course.fetchById(courseId, db),
		User.fromCid(db, studentCid)
	]);
	if (!course || !student) return;

	await queueCourseEnrollmentEmail(db, {
		event,
		courseId,
		courseName: course.name,
		student: { cid: student.cid, name_full: student.name_full },
		vectorUrl: env.PUBLIC_VECTOR_URL
	});
}

export async function notifyCourseEnrollmentEmailByWaitlist(
	event: CourseEnrollmentEmailEvent,
	waitlistId: number,
	studentCid: number
): Promise<void> {
	const course = await Course.fetchByWaitlistId(waitlistId, db);
	if (!course) return;

	await notifyCourseEnrollmentEmail(event, course.id, studentCid);
}
