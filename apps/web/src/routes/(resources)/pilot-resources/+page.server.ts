import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async () => {
  const pilotResources = await db.query.resources.findMany({
    where: (resources, { eq, and, or }) =>
      and(or(eq(resources.type, 'pilot'), eq(resources.type, 'both')), eq(resources.public, 1)),
    columns: {
      public: false,
      type: false
    }
  });

  return {
    resources: pilotResources.sort((a, b) => {
      return a.name.localeCompare(b.name);
    })
  };
}) satisfies PageServerLoad;
