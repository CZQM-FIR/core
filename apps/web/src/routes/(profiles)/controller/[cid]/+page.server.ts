import { db } from '$lib/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { User } from '@czqm/common';

export const load = (async ({ params }) => {
  const { cid } = params;

  const user = await User.fromCid(db, Number(cid));

  if (!user || !user.flags.some((f) => [4, 5].includes(f.id)) || user.cid !== Number(cid)) {
    return error(404, {
      message: 'Controller not Found'
    });
  }

  const userData = {
    cid: user.cid,
    displayName: user.displayName,
    rating: user.rating,
    roster: {
      gnd: user.getRosterStatus('gnd'),
      twr: user.getRosterStatus('twr'),
      app: user.getRosterStatus('app'),
      ctr: user.getRosterStatus('ctr')
    },
    active: user.active,
    sessions: user.sessions,
    bio: user.bio
  };

  return {
    userData
  };
}) satisfies PageServerLoad;
