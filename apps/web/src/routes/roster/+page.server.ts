import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { User } from '@czqm/common';

export const load = (async () => {
  const users = await User.fromFlag(db, ['controller', 'visitor'], { withData: false });

  const rosterData = users.map((u) => {
    return {
      cid: u.cid,
      displayName: u.displayName,
      rating: u.rating.short,
      active: u.active,
      rosterStatuses: {
        gnd: u.getRosterStatus('gnd'),
        twr: u.getRosterStatus('twr'),
        app: u.getRosterStatus('app'),
        ctr: u.getRosterStatus('ctr')
      },
      role: u.role
    };
  });

  return {
    rosterData
  };
}) satisfies PageServerLoad;
