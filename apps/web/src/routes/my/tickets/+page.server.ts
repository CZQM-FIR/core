import { db } from '$lib/db';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load = (async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/auth?redirect=/my');
  }

  const user = await db.query.users.findFirst({
    where: { cid: locals.user!.cid },
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
