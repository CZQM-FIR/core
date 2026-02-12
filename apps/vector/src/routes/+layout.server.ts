import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(302, `${env.PUBLIC_WEB_URL}/auth?redirect=vector/${url.pathname}`);
	}

	const user = await db.query.users.findFirst({
		where: { cid: locals.user!.cid },
		with: {
			flags: true
		}
	});

	return {
		user,
		session: locals.session
	};
}) satisfies LayoutServerLoad;
