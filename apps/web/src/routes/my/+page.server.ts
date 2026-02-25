import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import * as schema from '@czqm/db/schema';
import { User, USER_FETCH_FULL } from '@czqm/common';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  const user = await User.fromCid(db, locals.user!.cid, USER_FETCH_FULL);

  if (!user) {
    throw redirect(303, '/auth?redirect=/my');
  }

  return {
    user,
    hours: user.hours
  };
}) satisfies PageServerLoad;

export const actions = {
  updateBio: async ({ request, locals }) => {
    const data = await request.formData();
    const bio = data.get('bio')?.toString() ?? '';

    if (!locals.user) {
      return {
        ok: false,
        message: 'Unauthorized',
        bio
      };
    }

    const cid = Number(locals.user.cid);

    if (!Number.isInteger(cid) || cid <= 0) {
      return {
        ok: false,
        message: 'Invalid user context',
        bio
      };
    }

    try {
      await db.update(schema.users).set({ bio }).where(eq(schema.users.cid, cid));

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
