import { getUser } from '$lib/auth';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	if (
		!event.locals.user ||
		!(await getUser(event))?.flags.some((f) =>
			['controller', 'visitor', 'admin'].includes(f.flag.name)
		)
	) {
		redirect(303, '/');
	}

	return {};
}) satisfies PageServerLoad;
