import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import { eq } from 'drizzle-orm';

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
  updateBio: async (event) => {
    const { user } = await auth(event);
    if (!user) {
      return { ok: false, message: 'Unauthorized', bio: '' };
    }
    const data = await event.request.formData();
    const bio = (data.get('bio') ?? '').toString();
    const cid = Number(user.cid);
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
  }
};
