import { query } from '$app/server';
import { db } from '$lib/db';

export const getHomeControllers = query(async () => {
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
