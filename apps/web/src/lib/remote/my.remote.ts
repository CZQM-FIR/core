import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import { User, USER_FETCH_FULL } from '@czqm/common';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { type } from 'arktype';

export const getMyProfile = query(async () => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my');
  }
  const user = await User.fromCid(db, cid, USER_FETCH_FULL);
  if (!user) {
    throw redirect(303, '/auth?redirect=/my');
  }
  return {
    user,
    hours: user.hours
  };
});

const UpdateBioSchema = type({ bio: 'string' });
export const updateBio = form(UpdateBioSchema, async ({ bio }) => {
  const event = getRequestEvent();
  if (!event.locals.user) {
    return { ok: false, message: 'Unauthorized', bio };
  }
  const cid = Number(event.locals.user.cid);
  if (!Number.isInteger(cid) || cid <= 0) {
    return { ok: false, message: 'Invalid user context', bio };
  }
  try {
    await db.update(schema.users).set({ bio }).where(eq(schema.users.cid, cid));
    return { ok: true, message: 'Bio updated successfully', bio };
  } catch (e) {
    console.error(e);
    return { ok: false, message: 'Failed to update bio', bio };
  }
});
