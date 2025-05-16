import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import { users } from '@czqm/db/schema';

export const load = (async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/auth?redirect=/my');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.cid, locals.user.cid),
    with: {
      flags: {
        with: {
          flag: true
        }
      }
    }
  });

  if (!user) {
    redirect(303, '/auth?redirect=/my');
  }

  return { user };
}) satisfies LayoutServerLoad;
