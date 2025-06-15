import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { error, redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/auth?redirect=/controller-resrouces');
  }

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.cid, locals.user!.cid),
    with: {
      flags: {
        with: {
          flag: true
        }
      }
    }
  });

  if (!user) {
    redirect(303, '/auth?redirect=/controller-resrouces');
  }

  if (!user.flags.some((f) => ['visitor', 'controller', 'admin'].includes(f.flag.name))) {
    return error(403, 'Unauthorized');
  }

  const controllerResources = await db.query.resources.findMany({
    where: (resources, { eq, and, or }) =>
      and(
        or(eq(resources.type, 'controller'), eq(resources.type, 'both')),
        eq(resources.public, true)
      ),
    columns: {
      public: false,
      type: false
    }
  });

  return {
    resources: controllerResources.sort((a, b) => {
      const categoryOrder = [
        'Policy',
        'Software',
        'Guide',
        'Reference',
        'Letter of Agreement',
        'Other'
      ];
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);

      if (aIndex !== -1 && bIndex !== -1) {
        if (aIndex !== bIndex) return aIndex - bIndex;
      } else if (aIndex !== -1) {
        return -1;
      } else if (bIndex !== -1) {
        return 1;
      }

      return 1;
    })
  };
}) satisfies PageServerLoad;
