import { command, query } from '$app/server';
import { db } from '$lib/db';
import { waitingUsers, waitlists } from '@czqm/db/schema';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';

export const getWaitlist = query(type('number.integer >= 0'), async (waitlistId) => {
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

const MoveUserOptions = type({
	waitlistId: 'number.integer >= 0',
	userId: 'number.integer >= 0'
});

export const moveUserUp = command(MoveUserOptions, async ({ waitlistId, userId }) => {
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

	getWaitlist(waitlistId).refresh();
	return;
});

export const moveUserDown = command(MoveUserOptions, async ({ waitlistId, userId }) => {
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

	getWaitlist(waitlistId).refresh();
	return;
});

export const removeUserFromWaitlist = command(MoveUserOptions, async ({ waitlistId, userId }) => {
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

	getWaitlist(waitlistId).refresh();
	return;
});
