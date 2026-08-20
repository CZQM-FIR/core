import { Course, User, describeCourseTask } from '@czqm/common';
import { queueCourseTaskCompletionEmail } from '@czqm/common/notifications';
import { db } from '$lib/db';
import env from '$lib/env';

type CourseTaskCompletionEmailKind = 'certify' | 'solo';

export async function notifyCourseTaskCompletionEmail(
	kind: CourseTaskCompletionEmailKind,
	courseId: string,
	studentCid: number,
	instructorCid: number,
	task: { taskType: string; taskValue1: string | null; taskValue2: string | null }
): Promise<void> {
	const [course, student, instructor] = await Promise.all([
		Course.fetchById(courseId, db),
		User.fromCid(db, studentCid),
		User.fromCid(db, instructorCid)
	]);
	if (!course || !student || !instructor) return;

	await queueCourseTaskCompletionEmail(db, {
		kind,
		courseId,
		courseName: course.name,
		student: { cid: student.cid, name_full: student.name_full },
		instructor: { cid: instructor.cid, name_full: instructor.name_full },
		summary: describeCourseTask(task),
		vectorUrl: env.PUBLIC_VECTOR_URL
	});
}
