import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	if (!/^[0-9a-z]{5}$/.test(params.id)) {
		throw redirect(303, '/');
	}

	return { courseId: params.id };
}) satisfies PageServerLoad;
