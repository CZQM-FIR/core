import { db } from '$lib/db';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		return {
			user: null,
			session: null
		};
	}

	const user = await db.query.users.findFirst({
		where: {
			cid: locals.user!.cid
		},
		with: {
			flags: true
		}
	});

	return {
		user,
		session: locals.session
	};
}) satisfies LayoutServerLoad;
