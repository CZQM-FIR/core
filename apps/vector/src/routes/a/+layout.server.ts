import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	User,
	getAssistantParentFlagsForUser,
	userHasVectorWaitlistAdminAccess
} from '@czqm/common';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/');
	}

	const user = await User.fromCid(db, locals.user.cid);
	if (!user) {
		throw redirect(303, '/');
	}

	const assistantParents = await getAssistantParentFlagsForUser(db, user.cid);

	if (!userHasVectorWaitlistAdminAccess(user, assistantParents)) {
		throw redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
