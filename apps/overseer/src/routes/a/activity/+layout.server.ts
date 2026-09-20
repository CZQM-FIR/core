import type { LayoutServerLoad } from './$types';
import { requireOverseerTrainingTools } from '$lib/server/requireToolAccess';

export const load = (async ({ locals }) => {
	await requireOverseerTrainingTools(locals.user?.cid);
	return {};
}) satisfies LayoutServerLoad;
