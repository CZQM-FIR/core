import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const cid = Number(params.cid);
  return { cid: isNaN(cid) ? 0 : cid };
}) satisfies PageServerLoad;
