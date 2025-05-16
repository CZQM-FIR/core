import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async () => {
  type StaffUser = {
    cid: number;
    name_full: string;
    bio: string | null;
    flags: {
      userId: number;
      flagId: number;
      flag: {
        name: string;
      };
    }[];
    role?: string;
  };

  const users = (await db.query.users.findMany({
    columns: {
      cid: true,
      name_full: true,
      bio: true
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
      }
    }
  })) as StaffUser[];

  const staff = users.filter((user) => user.flags.some((flag) => flag.flag.name === 'staff'));

  let sorting = {
    chief: 5,
    deputy: 4,
    'chief-instructor': 3,
    events: 2,
    sector: 1,
    web: 0
  };

  staff.sort((a, b) => {
    let aScore = 0;
    let bScore = 0;

    for (const flag of a.flags) {
      if (flag.flag.name in sorting)
        aScore = Math.max(aScore, sorting[flag.flag.name as keyof typeof sorting]);
    }

    for (const flag of b.flags) {
      if (flag.flag.name in sorting)
        bScore = Math.max(bScore, sorting[flag.flag.name as keyof typeof sorting]);
    }

    return bScore - aScore;
  });

  staff.map((staff) => {
    let roles = [];

    if (staff.flags.some((flag) => flag.flag.name === 'chief')) roles.push('FIR Chief');
    if (staff.flags.some((flag) => flag.flag.name === 'deputy')) roles.push('Deputy FIR Chief');
    if (staff.flags.some((flag) => flag.flag.name === 'chief-instructor'))
      roles.push('Chief Instructor');
    if (staff.flags.some((flag) => flag.flag.name === 'web')) roles.push('Webmaster');
    if (staff.flags.some((flag) => flag.flag.name === 'events')) roles.push('Events Coordinator');
    if (staff.flags.some((flag) => flag.flag.name === 'sector')) roles.push('Facility Engineer');

    staff.role = roles.join(' & ');
  });

  return {
    staff
  };
}) satisfies PageServerLoad;
