import { query } from '$app/server';
import { db } from '$lib/db';
import { User, SoloEndorsement } from '@czqm/common';

export const getRosterData = query(async () => {
  const users = await User.fromFlag(db, ['controller', 'visitor'], {
    roster: true,
    soloEndorsements: true
  });
  const rosterData = users.map((u) => ({
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
  }));
  return { rosterData };
});

export const getSoloEndorsements = query(async () => {
  const solos = await SoloEndorsement.fetchAll(db);
  const solosData = solos.map((s) => {
    const { callsign, frequency, name } = s.position;
    return {
      cid: s.cid,
      position: { callsign, frequency, name },
      active: s.isActive,
      displayName: s.controller.displayName,
      expiresAt: s.expiresAt.toJSON()
    };
  });
  return { solos: solosData };
});
