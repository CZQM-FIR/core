import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import {
	completedUsers,
	enrolledUsers,
	moodleQueue,
	waitingUsers,
	waitlists
} from '@czqm/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { Course, User } from '@czqm/common';
import { authorizeVectorAdminAccess } from './auth';

export const editWaitlistName = form(
	type({
		name: 'string'
	}),
	async ({ name }) => {
		const event = getRequestEvent();
		await authorizeVectorAdminAccess();

		const id = Number(event.params.id);

		if (isNaN(id)) throw error(400, 'Missing ID');

		await db
			.update(waitlists)
			.set({
				name
			})
			.where(eq(waitlists.id, id));

		getWaitlist(id).refresh();

		return {
			success: true
		};
	}
);

export const deleteWaitlist = command(type('number.integer >= 0'), async (id) => {
	await authorizeVectorAdminAccess();

	await db.delete(waitlists).where(eq(waitlists.id, id));

	getWaitlists().refresh();
});

export const createWaitlist = form(
	type({
		name: 'string',
		wcohort: 'string',
		cohort: 'string'
	}),
	async ({ name, wcohort, cohort }) => {
		await authorizeVectorAdminAccess();

		const waitlist = await db
			.insert(waitlists)
			.values({
				name,
				waitlistCohort: wcohort,
				enrolledCohort: cohort
			})
			.returning({
				id: waitlists.id
			});

		getWaitlists().refresh();

		redirect(303, `/a/waitlist/${waitlist[0].id}`);
	}
);

export const getWaitlists = query(async () => {
	await authorizeVectorAdminAccess();

	const allWaitlists = await db.query.waitlists.findMany({
		with: {
			students: true
		}
	});

	return allWaitlists;
});

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

export const addUserToWaitlist = form(
	type({
		waitlistId: 'string.integer',
		userId: 'string.integer'
	}),
	async ({ waitlistId: waitlistIdString, userId: userIdString }) => {
		await authorizeVectorAdminAccess();

		const waitlistId = Number(waitlistIdString);
		const userId = Number(userIdString);

		const waitlist = await db.query.waitlists.findFirst({
			where: { id: waitlistId },
			with: {
				students: true
			}
		});
		if (!waitlist) throw error(404, 'Waitlist Not Found');

		const existingUser = waitlist.students.find((s) => s.cid === userId);
		if (existingUser) throw error(400, 'User already on waitlist');

		const user = await User.fromCid(db, userId);
		if (!user) throw error(404, 'User not found');

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
	}
);

export const editWaitlistEstimatedTime = form(
	type({
		waitlistId: 'string.integer',
		estimatedTime: 'string'
	}),
	async ({ waitlistId: waitlistIdString, estimatedTime }) => {
		await authorizeVectorAdminAccess();

		const waitlistId = Number(waitlistIdString);

		await db
			.update(waitlists)
			.set({
				waitTime: estimatedTime
			})
			.where(eq(waitlists.id, waitlistId));

		return {
			success: true
		};
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

export const editWaitlistCohorts = form(
	type({
		waitlistId: 'string.integer',
		waitlistCohort: 'string',
		enrolledCohort: 'string'
	}),
	async ({ waitlistId: waitlistIdString, waitlistCohort, enrolledCohort }) => {
		await authorizeVectorAdminAccess();

		const waitlistId = Number(waitlistIdString);

		await db
			.update(waitlists)
			.set({
				waitlistCohort: waitlistCohort || null,
				enrolledCohort: enrolledCohort || null
			})
			.where(eq(waitlists.id, waitlistId));

		getWaitlist(waitlistId).refresh();

		return {
			success: true
		};
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

export const getIndividualsWaitlistEntries = query(async () => {
	const event = getRequestEvent();
	const cid = event.locals.user?.cid;

	if (!cid) {
		throw error(403, 'Forbidden');
	}

	const waitlistEntries = await db.query.waitingUsers.findMany({
		where: { cid: cid! },
		with: {
			waitlist: {
				columns: {
					id: true,
					name: true,
					waitTime: true
				}
			}
		}
	});

	return waitlistEntries;
});

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

		const course = await Course.fetchByWaitlistId(waitlistId, db);
		if (!course) throw error(404, 'Course not found for waitlist');

		await course.graduateUser(userId);

		getEnrolledWaitlistEntries(waitlistId).refresh();
		getCompletedWaitlistEntries(waitlistId).refresh();
		getWaitlist(waitlistId).refresh();

		return {
			success: true
		};
	}
);
