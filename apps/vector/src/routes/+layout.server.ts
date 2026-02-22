import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(302, `${env.PUBLIC_WEB_URL}/auth?redirect=vector/${url.pathname}`);
	}

	const user = await User.fromCid(db, locals.user!.cid);

	return {
		user,
		session: locals.session
	};
}) satisfies LayoutServerLoad;
