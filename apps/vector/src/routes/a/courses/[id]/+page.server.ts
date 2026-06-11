import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	if (!/^[0-9a-z]{5}$/.test(params.id)) {
		return redirect(303, '/a/courses');
	}

	return { id: params.id };
}) satisfies PageServerLoad;
