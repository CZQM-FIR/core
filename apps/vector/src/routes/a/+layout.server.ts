import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
	const user = await User.fromCid(db, locals.user!.cid);

	if (!user || !user.hasFlag(['admin', 'chief-instructor', 'chief', 'deputy'])) {
		throw redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
