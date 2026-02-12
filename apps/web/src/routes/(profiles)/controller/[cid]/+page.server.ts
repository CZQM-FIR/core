import { db } from '$lib/db';
import { getUserRole } from '$lib/utilities/getUserRole';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const { cid } = params;

  const userData = await db.query.users.findFirst({
    where: { cid: Number(cid) },
    with: {
      flags: true,
      rating: true,
      roster: true,
      soloEndorsements: {
        with: {
          position: true
        }
      },
      sessions: {
        with: {
          position: true
        }
      },
      preferences: true
    },
    columns: {
      cid: true,
      bio: true,
      name_first: true,
      name_last: true,
      name_full: true
    }
  });

  if (
    !userData ||
    !userData.flags.some((f) => [4, 5].includes(f.id)) ||
    userData.cid !== Number(cid)
  ) {
    return error(404, {
      message: 'Controller not Found'
    });
  }

  const role = getUserRole(userData.flags);

  return {
    userData,
    role
  };
}) satisfies PageServerLoad;
