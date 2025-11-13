import { goto } from '$app/navigation';
import { getUser } from '$lib/auth';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	if (
		!event.locals.user ||
		!(await getUser(event))?.flags.some((f) =>
			['controller', 'visitor', 'admin'].includes(f.flag.name)
		)
	) {
		goto('/');
	}

	return {};
}) satisfies PageServerLoad;
