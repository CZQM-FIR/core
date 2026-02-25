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

export const getHomeControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, 'controller');
});

export const getVisitingControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, 'visitor');
});

export const getAllControllers = query(async () => {
	const event = getRequestEvent();

	const actioner = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!actioner || !actioner.hasFlag(['admin', 'staff', 'instructor', 'mentor'])) {
		throw error(403, 'Forbidden');
	}

	return await User.fromFlag(db, ['controller', 'visitor']);
});

export const getCurrentUserInfo = query(async () => {
	const event = getRequestEvent();
	const user = await User.fromSessionToken(db, event.cookies.get('session') || '');

	if (!user) {
		throw error(403, 'Forbidden');
	}

	return user;
});
