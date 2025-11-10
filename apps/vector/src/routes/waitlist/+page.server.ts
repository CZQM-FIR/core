import { goto } from '$app/navigation';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	if (!locals.user) {
		goto('/');
	}

	return {};
}) satisfies PageServerLoad;
