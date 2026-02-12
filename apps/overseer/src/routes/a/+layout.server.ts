import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		redirect(303, '/');
	}

	const user = await db.query.users.findFirst({
		where: { cid: locals.user!.cid },
		columns: {
			cid: true
		},
		with: {
			flags: true
		}
	});

	if (!user || user.flags.filter((f) => f.name === 'staff' || f.name === 'admin').length === 0) {
		redirect(303, '/');
	}

	return {};
}) satisfies LayoutServerLoad;
