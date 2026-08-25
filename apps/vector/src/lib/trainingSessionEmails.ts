import { Course, User } from '@czqm/common';
import {
	queueTrainingSessionEmails,
	type TrainingSessionEmailEvent
} from '@czqm/common/notifications';
import { db } from '$lib/db';
import env from '$lib/env';

type TrainingSessionEmailContext = {
	id: number;
	studentCid: number;
	scheduledByCid: number;
	startsAt: Date;
	endsAt: Date;
	previousScheduledByCid?: number;
};

export async function notifyTrainingSessionEmails(
	event: TrainingSessionEmailEvent,
	courseId: string,
	session: TrainingSessionEmailContext
): Promise<void> {
	const course = await Course.fetchById(courseId, db);
	if (!course) return;

	const [student, scheduler, previousScheduler] = await Promise.all([
		User.fromCid(db, session.studentCid),
		User.fromCid(db, session.scheduledByCid),
		session.previousScheduledByCid
			? User.fromCid(db, session.previousScheduledByCid)
			: Promise.resolve(null)
	]);
	if (!student || !scheduler) return;

	await queueTrainingSessionEmails(db, {
		event,
		courseId,
		courseName: course.name,
		sessionId: session.id,
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
		previousScheduler: previousScheduler
			? {
					cid: previousScheduler.cid,
					name_full: previousScheduler.name_full,
					displayName: previousScheduler.displayName
				}
			: undefined,
		vectorUrl: env.PUBLIC_VECTOR_URL
	});
}
