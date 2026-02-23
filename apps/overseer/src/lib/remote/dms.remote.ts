import { getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';

export const getDocuments = query(async () => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const documents = await db.query.dmsDocuments.findMany({
		with: {
			assets: true,
			group: true
		}
	});

	return documents;
});

export const getGroups = query(async () => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const groups = await db.query.dmsGroups.findMany({
		with: {
			documents: true
		},
		orderBy: (group) => [asc(group.sort)]
	});

	return groups;
});
