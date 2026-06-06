import { getRequestEvent } from '$app/server';
import { db } from '$lib/db';
import { error } from '@sveltejs/kit';
import { User, getAssistantParentFlagsForUser, userHasVectorAdminAccess } from '@czqm/common';

export async function authorizeVectorAdminAccess() {
	const event = getRequestEvent();
	const token = event.cookies.get('session');
	if (!token) {
		throw error(403, 'Forbidden');
	}
	const actioner = await User.fromSessionToken(db, token);
	if (!actioner) {
		throw error(403, 'Forbidden');
	}
	const parents = await getAssistantParentFlagsForUser(db, actioner.cid);
	if (!userHasVectorAdminAccess(actioner, parents)) {
		throw error(403, 'Forbidden');
	}
	return actioner;
}
