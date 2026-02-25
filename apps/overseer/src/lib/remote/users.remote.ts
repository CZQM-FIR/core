import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { type FlagName, User } from '@czqm/common';
import { error } from '@sveltejs/kit';

const staffFlags: FlagName[] = ['staff', 'admin'];

const getAuthorizedActioner = async () => {
	const event = getRequestEvent();

	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags: staffFlags
	});

	if (!actioner) {
		throw error(403, 'Forbidden');
	}

	return actioner;
};

export const getUsers = query(async () => {
	await getAuthorizedActioner();

	return await User.fromFlag(db, ['controller', 'visitor']);
});

export const getActivityUsers = query(async () => {
	await getAuthorizedActioner();

	return await User.fetchControllerVisitorActivitySummary(db);
});
