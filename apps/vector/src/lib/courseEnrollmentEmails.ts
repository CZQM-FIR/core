import { Course, User } from '@czqm/common';
import {
	queueCourseEnrollmentEmail,
	type CourseEnrollmentEmailEvent
} from '@czqm/common/notifications';
import { appSettings } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import env from '$lib/env';

export const COURSE_STATUS_NOTIFICATIONS_KEY = 'courseStatusNotificationsEnabled';

export async function areCourseStatusNotificationsEnabled(): Promise<boolean> {
	const [row] = await db
		.select({ value: appSettings.value })
		.from(appSettings)
		.where(eq(appSettings.key, COURSE_STATUS_NOTIFICATIONS_KEY))
		.limit(1);

	return row?.value !== 'false';
}

export async function notifyCourseEnrollmentEmail(
	event: CourseEnrollmentEmailEvent,
	courseId: string,
	studentCid: number
): Promise<void> {
	if (!(await areCourseStatusNotificationsEnabled())) return;

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
