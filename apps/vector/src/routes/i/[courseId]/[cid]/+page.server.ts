import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
	if (!/^[0-9a-z]{5}$/.test(params.courseId)) {
		throw redirect(303, '/');
	}

	const cid = Number(params.cid);
	if (!Number.isInteger(cid) || cid <= 0) {
		throw redirect(303, '/');
	}

	return { courseId: params.courseId, cid };
}) satisfies PageServerLoad;
