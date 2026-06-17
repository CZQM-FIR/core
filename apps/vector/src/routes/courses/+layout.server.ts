import { redirect } from '@sveltejs/kit';
import { User } from '@czqm/common';
import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';

export const load = (async (event) => {
	if (
		!event.locals.user ||
		!(await User.fromCid(db, event.locals.user.cid))?.hasFlag(['controller', 'visitor', 'admin'])
	) {
		redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
