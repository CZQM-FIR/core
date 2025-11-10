import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const waitlists = await db.query.waitlists.findMany({
		with: {
			students: {
				with: {
					user: true
				}
			}
		}
	});

	return {
		waitlists
	};
}) satisfies PageServerLoad;
