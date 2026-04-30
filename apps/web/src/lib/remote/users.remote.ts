import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { error } from '@sveltejs/kit';

export const getSessionUser = query(async () => {
	const event = getRequestEvent();
	const user = event.locals.user == null ? null : await User.fromCid(db, event.locals.user.cid);
	return {
		user,
		session: event.locals.session
	};
});

export const getCurrentUserInfo = query(async () => {
	const event = getRequestEvent();
	const user = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!user) {
		throw error(403, 'Forbidden');
	}

	return user;
});
