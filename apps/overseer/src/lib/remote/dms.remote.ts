import { command, form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import { DmsDocument, DmsGroup, User } from '@czqm/common';
import { error, invalid, redirect } from '@sveltejs/kit';
import { type } from 'arktype';

export const getDocuments = query(async () => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const documents = await DmsDocument.fetchAll(db);

	return documents;
});

export const getDocumentsByGroup = query(type('string'), async (groupId) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, groupId);

	if (!group) {
		throw error(404, 'Group not found');
	}

	return group.documents;
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

	const groups = await DmsGroup.fetchAll(db);

	return groups;
});

export const getGroup = query(type('string'), async (id) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, id);

	if (!group) {
		throw error(404, 'Group not found');
	}

	return group;
});

export const createGroup = form(
	type({
		name: 'string',
		slug: type.string.pipe((str) => str.toLowerCase().trim()),
		sort: 'number?'
	}),
	async ({ name, slug, sort = 99 }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			invalid(issue.slug('Slug can only contain lowercase letters, numbers, and dashes'));
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		const existingGroup = await DmsGroup.fromSlug(db, slug);

		if (existingGroup) {
			invalid(issue.slug(`Slug is already in use by another group`));
		}

		const newGroup = await DmsGroup.create(db, {
			name,
			slug,
			sort
		});

		return redirect(303, `/a/dms/groups/${newGroup.id}`);
	}
);

export const deleteGroup = command(type('string'), async (id) => {
	const event = getRequestEvent();
	const user = await User.resolveAuthenticatedUser(db, {
		cid: event.locals.user?.cid,
		sessionToken: event.cookies.get('session')
	});

	if (!user || !user.hasFlag(['admin', 'staff'])) {
		throw error(401, 'Unauthorized');
	}

	const group = await DmsGroup.fromId(db, id);

	if (!group) {
		throw error(404, 'Group not found');
	}

	await group.delete();

	getGroups().refresh();
	getDocuments().refresh();

	return;
});

export const editGroup = form(
	type({
		id: 'string',
		name: 'string',
		slug: type.string.pipe((str) => str.toLowerCase().trim()),
		sort: 'number'
	}),
	async ({ id, name, slug, sort }, issue) => {
		const event = getRequestEvent();
		const user = await User.resolveAuthenticatedUser(db, {
			cid: event.locals.user?.cid,
			sessionToken: event.cookies.get('session')
		});

		if (!user || !user.hasFlag(['admin', 'staff'])) {
			throw error(401, 'Unauthorized');
		}

		if (!/^[a-z0-9-]+$/.test(slug)) {
			invalid(issue.slug('Slug can only contain lowercase letters, numbers, and dashes'));
		}

		if (!(0 <= sort && sort <= 99)) {
			invalid(issue.sort('Sort must be a number between 0 and 99'));
		}

		await DmsGroup.update(db, id, {
			name,
			sort,
			slug
		});

		return {
			ok: true,
			id,
			name,
			slug,
			sort
		};
	}
);
