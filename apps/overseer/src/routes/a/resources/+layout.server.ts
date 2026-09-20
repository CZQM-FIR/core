import type { LayoutServerLoad } from './$types';
import { requireOverseerStaffScopedTools } from '$lib/server/requireToolAccess';

export const load = (async ({ locals }) => {
	await requireOverseerStaffScopedTools(locals.user?.cid);
	return {};
}) satisfies LayoutServerLoad;
