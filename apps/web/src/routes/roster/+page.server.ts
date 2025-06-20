import type { PageServerLoad } from './$types';
import { getUserRole } from '$lib/utilities/getUserRole';
import { db } from '$lib/db';
import { type } from 'arktype';
import { fail } from '@sveltejs/kit';

const ExtendedUser = type({
  cid: 'number.integer',
  name_full: 'string',
  rating: {
    id: 'number.integer >= 0',
    long: 'string',
    short: 'string'
  },
  flags: [
    {
      userId: 'number.integer >= 0',
      flagId: 'number.integer >= 0',
      flag: {
        name: 'string'
      }
    }
  ],
  'role?': 'string',
  active: 'number.integer >= -1 & number.integer <= 1'
});

const ExtendedUsers = type([ExtendedUser]);

export const load = (async () => {
  const users = ExtendedUsers(
    await db.query.users.findMany({
      columns: {
        cid: true,
        name_full: true,
        ratingID: true,
        active: true
      },
      with: {
        flags: {
          with: {
            flag: {
              columns: {
                name: true
              }
            }
          }
        },
        rating: true,
        roster: true,
        soloEndorsements: {
          with: {
            position: true
          }
        }
      }
    })
  );

  if (users instanceof type.errors) {
    return fail(500);
  }

  const controllers = users.filter((controller) => {
    return controller.flags.some(
      (flag) => flag.flag.name === 'controller' || flag.flag.name === 'visitor'
    );
  });

  controllers.map(async (controller) => {
    controller.role = getUserRole(controller.flags);
  });

  return {
    controllers
  };
}) satisfies PageServerLoad;
