import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async ({ locals, route }) => {
  if (!locals.user) {
    redirect(303, `/auth?redirect=${route}`);
  }

  const user = await db.query.users.findFirst({
    where: { cid: locals.user!.cid },
    with: {
      flags: true
    }
  });

  if (!user) {
    redirect(303, `/auth?redirect=${route}`);
  }

  return { user };
}) satisfies LayoutServerLoad;
