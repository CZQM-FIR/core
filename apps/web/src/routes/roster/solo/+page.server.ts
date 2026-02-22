import { db } from '$lib/db';
import type { PageServerLoad } from './$types';
import { SoloEndorsement } from '@czqm/common';

export const load = (async () => {
  const solos = await SoloEndorsement.fetchAll(db);

  const solosData = solos.map((s) => {
    const { callsign, frequency, name } = s.position;

    return {
      cid: s.cid,
      position: {
        callsign,
        frequency,
        name
      },
      active: s.isActive,
      displayName: s.controller.displayName,
      expiresAt: s.expiresAt.toJSON()
    };
  });

  return {
    solos: solosData
  };
}) satisfies PageServerLoad;
