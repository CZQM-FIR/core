import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async ({ locals }) => {
  let user;

  if (locals.user) {
    user = await db.query.users.findFirst({
      where: { cid: locals.user!.cid },
      with: {
        preferences: true
      }
    });
  }

  return {
    user,
    session: locals.session
  };
}) satisfies LayoutServerLoad;
