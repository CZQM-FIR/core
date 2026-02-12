import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import * as schema from '@czqm/db/schema';

export const load = (async ({ locals }) => {
  const user = await db.query.users.findFirst({
    where: { cid: locals.user!.cid },
    with: {
      flags: true,
      rating: true,
      sessions: {
        with: {
          position: true
        }
      }
    }
  });

  return { user };
}) satisfies PageServerLoad;

export const actions = {
  updateBio: async ({ request, locals }) => {
    const data = await request.formData();
    const bio = data.get('bio')?.toString() || '';

    try {
      await db
        .update(schema.users)
        .set({ bio })
        .where(eq(schema.users.cid, locals.user!.cid))
        .execute();

      return {
        ok: true,
        message: 'Bio updated successfully',
        bio
      };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
        message: 'Failed to update bio',
        bio
      };
    }
  }
};
