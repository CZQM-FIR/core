import { query } from '$app/server';
import { db } from '$lib/db';
import { User } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';

export const getControllerProfile = query(type('number.integer >= 0'), async (cid) => {
  const profile = await User.fetchControllerProfileForPublic(db, cid);
  if (!profile) {
    throw error(404, { message: 'Controller not Found' });
  }
  return { userData: profile };
});
