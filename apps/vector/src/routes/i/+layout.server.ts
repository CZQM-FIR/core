import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { User, userHasVectorInstructorAccess } from '@czqm/common';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/');
	}

	const user = await User.fromCid(db, locals.user.cid);
	if (!user || !userHasVectorInstructorAccess(user)) {
		throw redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
