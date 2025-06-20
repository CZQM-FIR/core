import { db } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  const solos = await db.query.soloEndorsements.findMany({
    with: {
      controller: {
        columns: {
          cid: true,
          name_full: true
        }
      },
      position: true
    }
  });

  return {
    solos: solos.filter((s) => {
      return s.expiresAt.valueOf() > Date.now();
    })
  };
}) satisfies PageServerLoad;
