import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '@czqm/common';
import { db } from '$lib/db';

export const load = (async (event) => {
	if (
		!event.locals.user ||
		!(await User.fromCid(db, event.locals.user.cid))?.hasFlag(['controller', 'visitor', 'admin'])
	) {
		redirect(303, '/');
	}

	return {};
}) satisfies PageServerLoad;
