import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';
import { type FlagName, User, getAssistantParentFlagsForUser } from '@czqm/common';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		return {
			user: null,
			session: null,
			assistantParentFlags: [] as FlagName[]
		};
	}

	const user = await User.fromCid(db, locals.user!.cid);
	if (!user) {
		return {
			user: null,
			session: locals.session,
			assistantParentFlags: [] as FlagName[]
		};
	}

	const assistantParentFlags = await getAssistantParentFlagsForUser(db, user.cid);

	return {
		user,
		session: locals.session,
		assistantParentFlags
	};
}) satisfies LayoutServerLoad;
