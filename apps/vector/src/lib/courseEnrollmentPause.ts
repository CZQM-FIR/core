import { Course } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';

export const TRAINING_PAUSED_MESSAGE = 'Training in this course is paused';

export type CoursePauseInfo = {
	pausedAt: Date;
	pauseReason: string;
};

export function toCoursePauseInfo(
	enrolled:
		| {
				pausedAt: Date | null;
				pauseReason: string | null;
		  }
		| null
		| undefined
): CoursePauseInfo | null {
	if (!enrolled?.pausedAt) return null;
	const reason = enrolled.pauseReason?.trim();
	return {
		pausedAt: enrolled.pausedAt,
		pauseReason: reason && reason.length > 0 ? reason : 'No reason provided'
	};
}

export function assertEnrollmentNotPaused(
	enrolled: { pausedAt: Date | null } | null | undefined
): void {
	if (enrolled?.pausedAt) {
		throw error(400, TRAINING_PAUSED_MESSAGE);
	}
}

export async function requireActiveEnrollment(
	courseId: string,
	cid: number,
	notEnrolledMessage: string
) {
	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const enrolled = await db.query.enrolledUsers.findFirst({
		where: {
			waitlistId: course.waitlist.id,
			cid,
			hiddenAt: { isNull: true }
		}
	});
	if (!enrolled) throw error(400, notEnrolledMessage);

	return { course, enrolled };
}

export async function requireActiveUnpausedEnrollment(
	courseId: string,
	cid: number,
	notEnrolledMessage: string
) {
	const result = await requireActiveEnrollment(courseId, cid, notEnrolledMessage);
	assertEnrollmentNotPaused(result.enrolled);
	return result;
}
