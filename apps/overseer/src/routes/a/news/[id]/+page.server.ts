import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const id = Number(params.id);

	if (isNaN(id)) {
		return redirect(303, '/a/news');
	}

	return { id };
}) satisfies PageServerLoad;
