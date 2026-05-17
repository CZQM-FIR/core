import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';
import { User, getAssistantParentFlagsForUser } from '@czqm/common';

export const load = (async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(302, `${env.PUBLIC_WEB_URL}/auth?redirect=vector/${url.pathname}`);
	}

	const user = await User.fromCid(db, locals.user.cid);
	if (!user) {
		throw redirect(302, `${env.PUBLIC_WEB_URL}/auth?redirect=vector/${url.pathname}`);
	}

	const assistantParentFlags = await getAssistantParentFlagsForUser(db, user.cid);

	return {
		user,
		session: locals.session,
		assistantParentFlags
	};
}) satisfies LayoutServerLoad;
