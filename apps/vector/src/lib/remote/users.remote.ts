import { getRequestEvent, query } from '$app/server';
import { getUser } from '$lib/auth';
import { db } from '$lib/db';
import { error } from '@sveltejs/kit';

export const getHomeControllers = query(async () => {
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) => ['admin', 'staff', 'instructor', 'mentor'].includes(f.flag.name))
	) {
		throw error(403, 'Forbidden');
	}

	const users = await db.query.users.findMany({
		with: {
			flags: {
				with: {
					flag: true
				}
			}
		}
	});

	return users.filter((u) => u.flags.some((f) => f.flag.name === 'controller'));
});

export const getVisitingControllers = query(async () => {
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) => ['admin', 'staff', 'instructor', 'mentor'].includes(f.flag.name))
	) {
		throw error(403, 'Forbidden');
	}

	const users = await db.query.users.findMany({
		with: {
			flags: {
				with: {
					flag: true
				}
			}
		}
	});

	return users.filter((u) => u.flags.some((f) => f.flag.name === 'visitor'));
});

export const getAllControllers = query(async () => {
	const actioner = await getUser(getRequestEvent());
	if (
		!actioner ||
		!actioner.flags.some((f) => ['admin', 'staff', 'instructor', 'mentor'].includes(f.flag.name))
	) {
		throw error(403, 'Forbidden');
	}

	const users = await db.query.users.findMany({
		orderBy: (users) => [users.name_last],
		with: {
			flags: {
				with: {
					flag: true
				}
			}
		}
	});

	return users.filter((u) =>
		u.flags.some((f) => f.flag.name === 'controller' || f.flag.name === 'visitor')
	);
});

export const getCurrentUserInfo = query(async () => {
	const user = await getUser(getRequestEvent());

	if (!user) {
		throw error(403, 'Forbidden');
	}

	return user;
});
