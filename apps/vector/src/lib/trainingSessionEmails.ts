import { Course, User } from '@czqm/common';
import {
	queueTrainingSessionEmails,
	type TrainingSessionEmailEvent
} from '@czqm/common/notifications';
import { db } from '$lib/db';
import env from '$lib/env';

type TrainingSessionEmailContext = {
	studentCid: number;
	scheduledByCid: number;
	startsAt: Date;
	endsAt: Date;
};

export async function notifyTrainingSessionEmails(
	event: TrainingSessionEmailEvent,
	courseId: string,
	session: TrainingSessionEmailContext
): Promise<void> {
	const course = await Course.fetchById(courseId, db);
	if (!course) return;

	const [student, scheduler] = await Promise.all([
		User.fromCid(db, session.studentCid),
		User.fromCid(db, session.scheduledByCid)
	]);
	if (!student || !scheduler) return;

	await queueTrainingSessionEmails(db, {
		event,
		courseId,
		courseName: course.name,
		studentCid: session.studentCid,
		scheduledByCid: session.scheduledByCid,
		startsAt: session.startsAt,
		endsAt: session.endsAt,
		student: {
			cid: student.cid,
			name_full: student.name_full,
			displayName: student.displayName
		},
		scheduler: {
			cid: scheduler.cid,
			name_full: scheduler.name_full,
			displayName: scheduler.displayName
		},
		vectorUrl: env.PUBLIC_VECTOR_URL
	});
}
