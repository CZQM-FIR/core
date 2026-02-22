import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { User } from '@czqm/common';

export const load = (async ({ locals }) => {
  let user;

  if (locals.user) {
    user = await User.fromCid(db, locals.user.cid);
  }

  return {
    user,
    session: locals.session
  };
}) satisfies LayoutServerLoad;
