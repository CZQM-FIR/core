import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { User } from '@czqm/common';

export const load = (async ({ locals, route }) => {
  if (!locals.user) {
    redirect(303, `/auth?redirect=${route}`);
  }

  const user = await User.fromCid(db, locals.user!.cid);

  if (!user) {
    redirect(303, `/auth?redirect=${route}`);
  }

  return { user };
}) satisfies LayoutServerLoad;
