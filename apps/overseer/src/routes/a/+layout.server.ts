import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import { User, userCanAccessOverseerArea } from '@czqm/common';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/');
	}

	const user = await User.fromCid(db, locals.user!.cid);

	if (!user || !(await userCanAccessOverseerArea(db, user))) {
		redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
