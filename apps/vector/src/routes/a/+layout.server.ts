import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = await db.query.users.findFirst({
		where: (users, { eq }) => eq(users.cid, locals.user!.cid),
		with: {
			flags: {
				with: {
					flag: true
				}
			}
		}
	});

	if (
		!user ||
		!user.flags.some((f) => ['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.flag.name))
	) {
		throw redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
