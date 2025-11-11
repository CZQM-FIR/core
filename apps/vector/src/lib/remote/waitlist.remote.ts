import { command, form, getRequestEvent, query } from '$app/server';
import { getUser } from '$lib/auth';
import { db } from '$lib/db';
import { moodleQueue, waitingUsers, waitlists } from '@czqm/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

export const getWaitlist = query(type('number.integer >= 0'), async (waitlistId) => {
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) =>
			['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
		)
	) {
		throw error(403, 'Forbidden');
	}

	const waitlist = await db.query.waitlists.findFirst({
		where: eq(waitlists.id, waitlistId),
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
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) =>
			['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
		)
	) {
		throw error(403, 'Forbidden');
	}

	const waitlist = await db.query.waitlists.findFirst({
		where: eq(waitlists.id, waitlistId),
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

	await getWaitlist(waitlistId).refresh();
});

export const moveUserDown = command(WaitlistUserOptions, async ({ waitlistId, userId }) => {
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) =>
			['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
		)
	) {
		throw error(403, 'Forbidden');
	}

	const waitlist = await db.query.waitlists.findFirst({
		where: eq(waitlists.id, waitlistId),
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

	await getWaitlist(waitlistId).refresh();
});

export const removeUserFromWaitlist = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		const actioner = await getUser(getRequestEvent());
		if (
			!actioner ||
			!actioner.flags.some((f) =>
				['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
			)
		) {
			throw error(403, 'Forbidden');
		}

		const waitlist = await db.query.waitlists.findFirst({
			where: eq(waitlists.id, waitlistId),
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

		await getWaitlist(waitlistId).refresh();

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
		const actioner = await getUser(getRequestEvent());
		if (
			!actioner ||
			!actioner.flags.some((f) =>
				['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
			)
		) {
			throw error(403, 'Forbidden');
		}

		const waitlistId = Number(waitlistIdString);
		const userId = Number(userIdString);

		const waitlist = await db.query.waitlists.findFirst({
			where: eq(waitlists.id, waitlistId),
			with: {
				students: true
			}
		});
		if (!waitlist) throw error(404, 'Waitlist Not Found');

		const existingUser = waitlist.students.find((s) => s.cid === userId);
		if (existingUser) throw error(400, 'User already on waitlist');

		const user = await db.query.users.findFirst({
			where: eq(waitingUsers.cid, userId)
		});
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

		await getWaitlist(waitlistId).refresh();
	}
);

export const enrolUserFromWaitlist = command(
	WaitlistUserOptions,
	async ({ waitlistId, userId }) => {
		const actioner = await getUser(getRequestEvent());
		if (
			!actioner ||
			!actioner.flags.some((f) =>
				['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
			)
		) {
			throw error(403, 'Forbidden');
		}

		const waitlist = await db.query.waitlists.findFirst({
			where: eq(waitlists.id, waitlistId),
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
	}
);

export const editWaitlistEstimatedTime = form(
	type({
		waitlistId: 'string.integer',
		estimatedTime: 'string'
	}),
	async ({ waitlistId: waitlistIdString, estimatedTime }) => {
		const actioner = await getUser(getRequestEvent());
		if (
			!actioner ||
			!actioner.flags.some((f) =>
				['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name)
			)
		) {
			throw error(403, 'Forbidden');
		}

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
