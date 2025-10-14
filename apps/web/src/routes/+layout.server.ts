import { users } from '@czqm/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';

export const load = (async ({ locals }) => {
  const user = await db.query.users.findFirst({
    where: eq(users.cid, locals.user.cid),
    with: {
      preferences: true
    }
  });

  return {
    user,
    session: locals.session
  };
}) satisfies LayoutServerLoad;
