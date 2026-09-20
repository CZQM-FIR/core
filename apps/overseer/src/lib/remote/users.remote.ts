import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { OVERSEER_TRAINING_TOOL_FLAGS, User, userCanAccessOverseerArea } from '@czqm/common';
import { error } from '@sveltejs/kit';

/** Users / Activity remotes: same OR gate as training nav (`OVERSEER_TRAINING_TOOL_FLAGS`). */
const authorizeUsersOrActivityList = async () => {
	const event = getRequestEvent();
	const actioner = await User.resolveAuthorizedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session'),
		requiredFlags: OVERSEER_TRAINING_TOOL_FLAGS
	});
	if (!actioner) {
		throw error(403, 'Forbidden');
	}
	return actioner;
};

export const getSessionUser = query(async () => {
	const event = getRequestEvent();
	const user = event.locals.user == null ? null : await User.fromCid(db, event.locals.user.cid);
	const hasOverseerAccess = user != null && (await userCanAccessOverseerArea(db, user));
	return {
		user,
		session: event.locals.session,
		hasOverseerAccess
	};
});

export const getUsers = query(async () => {
	await authorizeUsersOrActivityList();

	return await User.fromFlag(db, ['controller', 'visitor']);
});

export const getActivityUsers = query(async () => {
	await authorizeUsersOrActivityList();

	return await User.fetchControllerVisitorActivitySummary(db);
});
