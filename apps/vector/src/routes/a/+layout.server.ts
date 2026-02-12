import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const user = await db.query.users.findFirst({
		where: { cid: locals.user!.cid },
		with: {
			flags: true
		}
	});

	if (
		!user ||
		!user.flags.some((f) => ['admin', 'chief-instructor', 'chief', 'deputy'].includes(f.name))
	) {
		throw redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
