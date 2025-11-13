import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import * as schema from '@czqm/db/schema';

export const load = (async ({ locals }) => {
	const user =
		locals.user == null
			? null
			: await db.query.users.findFirst({
					where: eq(schema.users.cid, locals.user!.cid),
					columns: {
						name_first: true,
						name_last: true,
						name_full: true,
						cid: true
					},
					with: {
						flags: {
							columns: {
								flagId: false,
								userId: false
							},
							with: {
								flag: true
							}
						}
					}
				});

	return {
		user,
		session: locals.session
	};
}) satisfies PageServerLoad;
