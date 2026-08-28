import { command, query } from '$app/server';
import { db } from '$lib/db';
import { enrolledUsers, moodleQueue, waitingUsers, waitlists } from '@czqm/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { Course, User, userHasVectorInstructorAccess } from '@czqm/common';
import { authorizeVectorAdminAccess } from './auth';
import { notifyCourseEnrollmentEmailByWaitlist } from '$lib/courseEnrollmentEmails';
import {
	getInstructorEnrolledEntries,
	getInstructorStudentView,
	getStudentsWithSessionAvailability
} from './instructor.remote';

export const getWaitlist = query(type('number.integer >= 0'), async (waitlistId) => {
	await authorizeVectorAdminAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId },
		with: {
			students: {
				orderBy: (students) => [students.position],
				with: {
					user: true
				}
			}
		}
	});

	if (!waitlist) throw error(404, 'Waitlist not found');

	return waitlist;
});

const WaitlistUserOptions = type({
	waitlistId: 'number.integer >= 0',
	userId: 'number.integer >= 0'
});

export const checkWaitlistPrerequisites = query(
	type({
		waitlistId: 'number.integer >= 0',
		userId: 'number.integer >= 0'
	}),
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchByWaitlistId(waitlistId, db);
		if (!course || course.prerequisites.length === 0) {
			return { satisfied: true, failures: [], results: [] };
		}

		const user = await User.fromCid(db, userId, {
			sessions: true,
			completedPositions: true
		});
		if (!user) throw error(404, 'User not found');

		return course.evaluatePrerequisites(user);
	}
);

export const moveUserUp = command(WaitlistUserOptions, async ({ waitlistId, userId }) => {
	await authorizeVectorAdminAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId },
		with: {
			students: true
		}
	});
	if (!waitlist) throw error(404, 'Waitlist Not Found');

	const user = waitlist.students.find((s) => s.cid === userId);
	if (!user) throw error(404, 'User not found');

	if (user.position === 0) throw error(400, 'User already at top of list');

	const otherUser = waitlist.students.find((s) => s.position === user.position - 1);

	if (!otherUser) throw error(500, 'Other User not found');

	await db
		.update(waitingUsers)
		.set({
			position: user.position - 1
		})
		.where(and(eq(waitingUsers.cid, userId), eq(waitingUsers.waitlistId, waitlistId)));

	await db
		.update(waitingUsers)
		.set({ position: otherUser.position + 1 })
		.where(and(eq(waitingUsers.cid, otherUser.cid), eq(waitingUsers.waitlistId, waitlistId)));

	getWaitlist(waitlistId).refresh();
});

export const moveUserDown = command(WaitlistUserOptions, async ({ waitlistId, userId }) => {
	await authorizeVectorAdminAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId },
		with: {
			students: true
		}
	});
	if (!waitlist) throw error(404, 'Waitlist Not Found');

	const user = waitlist.students.find((s) => s.cid === userId);
	if (!user) throw error(404, 'User not found');

	if (user.position === waitlist.students.length - 1)
		throw error(400, 'User already at bottom of list');

	const otherUser = waitlist.students.find((s) => s.position === user.position + 1);

	if (!otherUser) throw error(500, 'Other User not found');

	await db
		.update(waitingUsers)
		.set({
			position: user.position + 1
		})
		.where(and(eq(waitingUsers.cid, userId), eq(waitingUsers.waitlistId, waitlistId)));

	await db
		.update(waitingUsers)
		.set({ position: otherUser.position - 1 })
		.where(and(eq(waitingUsers.cid, otherUser.cid), eq(waitingUsers.waitlistId, waitlistId)));

	getWaitlist(waitlistId).refresh();
});

export const removeUserFromWaitlist = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const waitlist = await db.query.waitlists.findFirst({
			where: { id: waitlistId },
			with: {
				students: true
			}
		});
		if (!waitlist) throw error(404, 'Waitlist Not Found');
		const user = waitlist.students.find((s) => s.cid === userId);
		if (!user) throw error(404, 'User not found');

		await db
			.delete(waitingUsers)
			.where(and(eq(waitingUsers.cid, userId), eq(waitingUsers.waitlistId, waitlistId)));

		const usersToUpdate = waitlist.students.filter((s) => s.position > user.position);
		for (const u of usersToUpdate) {
			await db
				.update(waitingUsers)
				.set({ position: u.position - 1 })
				.where(and(eq(waitingUsers.cid, u.cid), eq(waitingUsers.waitlistId, waitlistId)));
		}

		getWaitlist(waitlistId).refresh();

		if (waitlist.waitlistCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: waitlist.waitlistCohort,
				timestamp: new Date(),
				add: false
			});
		}
	}
);

const AddUserToWaitlistOptions = type({
	waitlistId: 'number.integer >= 0',
	userId: 'number.integer >= 0',
	'overridePrerequisites?': 'boolean'
});

export const addUserToWaitlist = command(
	AddUserToWaitlistOptions,
	async ({ waitlistId, userId, overridePrerequisites }) => {
		await authorizeVectorAdminAccess();

		const waitlist = await db.query.waitlists.findFirst({
			where: { id: waitlistId },
			with: {
				students: true
			}
		});
		if (!waitlist) throw error(404, 'Waitlist Not Found');

		const existingUser = waitlist.students.find((s) => s.cid === userId);
		if (existingUser) throw error(400, 'User already on waitlist');

		const course = await Course.fetchByWaitlistId(waitlistId, db);
		if (course && course.prerequisites.length > 0 && !overridePrerequisites) {
			const user = await User.fromCid(db, userId, {
				sessions: true,
				completedPositions: true
			});
			if (!user) throw error(404, 'User not found');

			const evaluation = await course.evaluatePrerequisites(user);
			if (!evaluation.satisfied) {
				throw error(400, {
					message: 'User does not meet course prerequisites',
					failures: evaluation.failures
				});
			}
		}

		await db.insert(waitingUsers).values({
			cid: userId,
			waitlistId: waitlistId,
			position: waitlist.students.length,
			waitingSince: new Date()
		});

		if (waitlist.waitlistCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: waitlist.waitlistCohort,
				timestamp: new Date()
			});
		}

		getWaitlist(waitlistId).refresh();

		try {
			await notifyCourseEnrollmentEmailByWaitlist('waitlisted', waitlistId, userId);
		} catch (err) {
			console.error('Failed to queue course enrollment email', err);
		}
	}
);

export const enrolUserFromWaitlist = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const waitlist = await db.query.waitlists.findFirst({
			where: { id: waitlistId },
			with: {
				students: true
			}
		});
		if (!waitlist) throw error(404, 'Waitlist Not Found');

		const user = waitlist.students.find((s) => s.cid === userId);
		if (!user) throw error(404, 'User not found');

		if (waitlist.enrolledCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: waitlist.enrolledCohort,
				timestamp: new Date()
			});
		}

		await db.insert(enrolledUsers).values({
			cid: userId,
			waitlistId,
			enrolledAt: new Date()
		});

		await db
			.delete(waitingUsers)
			.where(and(eq(waitingUsers.cid, userId), eq(waitingUsers.waitlistId, waitlistId)));

		const usersToUpdate = waitlist.students.filter((s) => s.position > user.position);
		for (const u of usersToUpdate) {
			await db
				.update(waitingUsers)
				.set({ position: u.position - 1 })
				.where(and(eq(waitingUsers.cid, u.cid), eq(waitingUsers.waitlistId, waitlistId)));
		}

		getWaitlist(waitlistId).refresh();
		getEnrolledWaitlistEntries(waitlistId).refresh();

		try {
			await notifyCourseEnrollmentEmailByWaitlist('enrolled', waitlistId, userId);
		} catch (err) {
			console.error('Failed to queue course enrollment email', err);
		}
	}
);

export const saveWaitlistEstimatedTime = command(
	type({
		waitlistId: 'number.integer >= 0',
		estimatedTime: 'string'
	}),
	async ({ waitlistId, estimatedTime }) => {
		await authorizeVectorAdminAccess();

		await db
			.update(waitlists)
			.set({
				waitTime: estimatedTime
			})
			.where(eq(waitlists.id, waitlistId));

		return { success: true };
	}
);

export const saveWaitlistCohorts = command(
	type({
		waitlistId: 'number.integer >= 0',
		waitlistCohort: 'string',
		enrolledCohort: 'string'
	}),
	async ({ waitlistId, waitlistCohort, enrolledCohort }) => {
		await authorizeVectorAdminAccess();

		await db
			.update(waitlists)
			.set({
				waitlistCohort: waitlistCohort || null,
				enrolledCohort: enrolledCohort || null
			})
			.where(eq(waitlists.id, waitlistId));

		return { success: true };
	}
);

export const getEnrolledWaitlistEntries = query(type('number.integer >= 0'), async (waitlistId) => {
	await authorizeVectorAdminAccess();

	const waitlist = await db.query.waitlists.findFirst({
		where: { id: waitlistId }
	});

	if (!waitlist) throw error(404, 'Waitlist not found');

	const enrolledEntries = await db.query.enrolledUsers.findMany({
		where: { waitlistId, hiddenAt: { isNull: true } },
		with: {
			user: true
		}
	});

	return enrolledEntries;
});

export const getCompletedWaitlistEntries = query(
	type('number.integer >= 0'),
	async (waitlistId) => {
		await authorizeVectorAdminAccess();

		const waitlist = await db.query.waitlists.findFirst({
			where: { id: waitlistId }
		});

		if (!waitlist) throw error(404, 'Waitlist not found');

		const completedEntries = await db.query.completedUsers.findMany({
			where: { waitlistId },
			with: {
				user: true
			},
			orderBy: (completedUsers, { desc }) => [desc(completedUsers.completedAt)]
		});

		return completedEntries;
	}
);

export const returnEnrolledUserToWaitlist = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const enrolledUser = await db.query.enrolledUsers.findFirst({
			where: { waitlistId, cid: userId },
			with: {
				waitlist: {
					with: {
						students: true
					}
				}
			}
		});

		if (!enrolledUser) throw error(404, 'Enrolled user not found');

		const waitlist = enrolledUser.waitlist;
		if (waitlist.students.some((s) => s.cid === userId)) {
			throw error(400, 'User already on waitlist');
		}

		const { enrolledCohort, waitlistCohort } = waitlist;

		if (enrolledCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: enrolledCohort,
				add: false,
				timestamp: new Date()
			});
		}

		if (waitlistCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: waitlistCohort,
				timestamp: new Date()
			});
		}

		await db
			.delete(enrolledUsers)
			.where(and(eq(enrolledUsers.waitlistId, waitlistId), eq(enrolledUsers.cid, userId)));

		await db.insert(waitingUsers).values({
			cid: userId,
			waitlistId,
			position: waitlist.students.length,
			waitingSince: new Date()
		});

		getEnrolledWaitlistEntries(waitlistId).refresh();
		getWaitlist(waitlistId).refresh();

		return { success: true };
	}
);

export const removeUserFromEnrolledCourse = command(
	type({
		waitlistId: 'number.integer',
		userId: 'number.integer'
	}),
	async ({ waitlistId: waitlistId, userId: userId }) => {
		await authorizeVectorAdminAccess();

		const enrolledUser = await db.query.enrolledUsers.findFirst({
			where: { waitlistId, cid: userId },
			with: {
				waitlist: true
			}
		});

		if (!enrolledUser) throw error(404, 'Enrolled user not found');

		const { enrolledCohort, waitlistCohort } = enrolledUser.waitlist;

		if (enrolledCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: enrolledCohort,
				add: false,
				timestamp: new Date()
			});
		}

		if (waitlistCohort) {
			await db.insert(moodleQueue).values({
				cid: userId,
				cohortId: waitlistCohort,
				add: false,
				timestamp: new Date()
			});
		}

		await db
			.delete(enrolledUsers)
			.where(and(eq(enrolledUsers.waitlistId, waitlistId), eq(enrolledUsers.cid, userId)));

		getEnrolledWaitlistEntries(waitlistId).refresh();
		getWaitlist(waitlistId).refresh();

		return {
			success: true
		};
	}
);

export const removeUserFromCompletedCourse = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const course = await Course.fetchByWaitlistId(waitlistId, db);
		if (!course) throw error(404, 'Course not found for waitlist');

		try {
			await course.removeUserCompletion(userId);
		} catch (e) {
			if (e instanceof Error && e.message.includes('has not completed')) {
				throw error(404, 'Completed user not found');
			}
			throw e;
		}

		getCompletedWaitlistEntries(waitlistId).refresh();

		return { success: true };
	}
);

export const graduateUserFromCourse = command(
	type({
		waitlistId: 'number.integer',
		userId: 'number.integer'
	}),
	async ({ waitlistId, userId }) => {
		await authorizeVectorAdminAccess();

		const enrolledUser = await db.query.enrolledUsers.findFirst({
			where: { waitlistId, cid: userId }
		});

		if (!enrolledUser) throw error(404, 'Enrolled user not found');
		if (enrolledUser.pausedAt) {
			throw error(400, 'Training in this course is paused');
		}

		const course = await Course.fetchByWaitlistId(waitlistId, db);
		if (!course) throw error(404, 'Course not found for waitlist');

		await course.graduateUser(userId);

		getEnrolledWaitlistEntries(waitlistId).refresh();
		getCompletedWaitlistEntries(waitlistId).refresh();
		getWaitlist(waitlistId).refresh();

		try {
			await notifyCourseEnrollmentEmailByWaitlist('completed', waitlistId, userId);
		} catch (err) {
			console.error('Failed to queue course enrollment email', err);
		}

		return {
			success: true
		};
	}
);

const CourseId = type(/^[0-9a-z]{5}$/);
const PauseEnrollmentOptions = type({
	courseId: CourseId,
	cid: 'number.integer > 0',
	reason: 'string'
});
const ResumeEnrollmentOptions = type({
	courseId: CourseId,
	cid: 'number.integer > 0'
});

function refreshEnrollmentPauseQueries(
	courseId: string,
	cid: number,
	waitlistId: number,
	actioner: User
) {
	// Instructor-only queries must be guarded — refreshes re-run under the admin's session.
	getInstructorStudentView({ courseId, cid }).refresh();
	getEnrolledWaitlistEntries(waitlistId).refresh();
	if (userHasVectorInstructorAccess(actioner)) {
		getInstructorEnrolledEntries(waitlistId).refresh();
		getStudentsWithSessionAvailability().refresh();
	}
}

export const pauseEnrolledStudent = command(
	PauseEnrollmentOptions,
	async ({ courseId, cid, reason }) => {
		const actioner = await authorizeVectorAdminAccess();

		const pauseReason = reason.trim();
		if (!pauseReason) throw error(400, 'A pause reason is required');
		if (pauseReason.length > 1000) throw error(400, 'Pause reason is too long');

		const course = await Course.fetchById(courseId, db);
		if (!course) throw error(404, 'Course not found');

		const enrolled = await db.query.enrolledUsers.findFirst({
			where: {
				waitlistId: course.waitlist.id,
				cid,
				hiddenAt: { isNull: true }
			}
		});
		if (!enrolled) throw error(400, 'Student is not enrolled in this course');
		if (enrolled.pausedAt) throw error(400, 'Training in this course is already paused');

		await db
			.update(enrolledUsers)
			.set({
				pausedAt: new Date(),
				pauseReason,
				pausedByCid: actioner.cid
			})
			.where(eq(enrolledUsers.id, enrolled.id));

		refreshEnrollmentPauseQueries(courseId, cid, course.waitlist.id, actioner);

		return { success: true as const };
	}
);

export const resumeEnrolledStudent = command(ResumeEnrollmentOptions, async ({ courseId, cid }) => {
	const actioner = await authorizeVectorAdminAccess();

	const course = await Course.fetchById(courseId, db);
	if (!course) throw error(404, 'Course not found');

	const enrolled = await db.query.enrolledUsers.findFirst({
		where: {
			waitlistId: course.waitlist.id,
			cid,
			hiddenAt: { isNull: true }
		}
	});
	if (!enrolled) throw error(400, 'Student is not enrolled in this course');
	if (!enrolled.pausedAt) throw error(400, 'Training in this course is not paused');

	await db
		.update(enrolledUsers)
		.set({
			pausedAt: null,
			pauseReason: null,
			pausedByCid: null
		})
		.where(eq(enrolledUsers.id, enrolled.id));

	refreshEnrollmentPauseQueries(courseId, cid, course.waitlist.id, actioner);

	return { success: true as const };
});
