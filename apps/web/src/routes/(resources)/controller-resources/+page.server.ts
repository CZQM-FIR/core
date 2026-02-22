import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { error, redirect } from '@sveltejs/kit';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/auth?redirect=/controller-resources');
  }

  const user = await User.fromCid(db, locals.user!.cid);

  if (!user) {
    redirect(303, '/auth?redirect=/controller-resources');
  }

  if (!user.hasFlag(['visitor', 'controller', 'admin'])) {
    return error(403, 'Unauthorized');
  }

  const controllerResources = await db.query.resources.findMany({
    where: {
      OR: [{ type: 'controller' }, { type: 'both' }],
      public: true
    },
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
