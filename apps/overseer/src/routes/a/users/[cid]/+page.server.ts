import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	const id = Number(params.cid);

	if (isNaN(id)) {
		return redirect(303, '/a/users');
	}

	return { id };
}) satisfies PageServerLoad;
