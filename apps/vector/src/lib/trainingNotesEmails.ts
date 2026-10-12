import { Course, User } from '@czqm/common';
import { queueTrainingNotesSubmittedEmail } from '@czqm/common/notifications';
import { db } from '$lib/db';
import env from '$lib/env';

type TrainingNotesEmailContext = {
	id: number;
	studentCid: number;
	scheduledByCid: number;
};

export async function notifyTrainingNotesSubmittedEmail(
	courseId: string,
	session: TrainingNotesEmailContext,
	course?: Course | null
): Promise<void> {
	const resolvedCourse = course ?? (await Course.fetchById(courseId, db));
	if (!resolvedCourse) return;

	const [student, instructor] = await Promise.all([
		User.fromCid(db, session.studentCid),
		User.fromCid(db, session.scheduledByCid)
	]);
	if (!student || !instructor) return;

	await queueTrainingNotesSubmittedEmail(db, {
		courseName: resolvedCourse.name,
		sessionId: session.id,
		student: {
			cid: student.cid,
			name_full: student.name_full,
			displayName: student.displayName
		},
		instructor: {
			cid: instructor.cid,
			name_full: instructor.name_full,
			displayName: instructor.displayName
		},
		vectorUrl: env.PUBLIC_VECTOR_URL
	});
}
