import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import * as schema from '@czqm/db/schema';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/');
	}

	const user = await db.query.users.findFirst({
		where: eq(schema.users.cid, locals.user.cid),
		columns: {
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

	if (
		!user ||
		user.flags.filter((f) => f.flag.name === 'staff' || f.flag.name === 'admin').length === 0
	) {
		redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
