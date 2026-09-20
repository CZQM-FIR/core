import type { LayoutServerLoad } from './$types';
import { requireOverseerEventsTools } from '$lib/server/requireToolAccess';

export const load = (async ({ locals }) => {
	await requireOverseerEventsTools(locals.user?.cid);
	return {};
}) satisfies LayoutServerLoad;
