import { db } from '$lib/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import * as schema from '@czqm/db/schema';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/auth?redirect=/my');
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.cid, locals.user!.cid),
    columns: {
      bio: false,
      email: false
    },
    with: {
      tickets: {
        columns: {
          authorId: false,
          typeId: false
        },
        with: {
          type: true,
          messages: true
        }
      }
    }
  });

  return { user };
}) satisfies PageServerLoad;
