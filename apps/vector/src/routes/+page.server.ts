import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user =
		locals.user == null
			? null
			: await db.query.users.findFirst({
					where: { cid: locals.user!.cid },
					columns: {
						name_first: true,
						name_last: true,
						name_full: true,
						cid: true
					},
					with: {
						flags: true
					}
				});

	return {
		user,
		session: locals.session
	};
}) satisfies PageServerLoad;
