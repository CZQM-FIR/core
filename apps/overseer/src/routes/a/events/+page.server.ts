import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	const events = await db.query.events.findMany();

	return { events };
}) satisfies PageServerLoad;
