import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const articles = await db.query.news.findMany({
		with: {
			author: true
		}
	});

	return { articles };
}) satisfies PageServerLoad;
