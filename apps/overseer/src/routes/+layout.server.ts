import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		return {
			user: null,
			session: null
		};
	}

	const user = await User.fromCid(db, locals.user!.cid);

	return {
		user,
		session: locals.session
	};
}) satisfies LayoutServerLoad;
