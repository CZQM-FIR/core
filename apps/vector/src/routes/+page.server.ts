import { db } from '$lib/db';
import type { PageServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
	const user = locals.user == null ? null : await User.fromCid(db, locals.user!.cid);

	return {
		user,
		session: locals.session
	};
}) satisfies PageServerLoad;
