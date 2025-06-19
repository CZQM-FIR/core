import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { type } from 'arktype';
import { fail } from '@sveltejs/kit';

const StaffUser = type({
  cid: 'number',
  name_full: 'string',
  'bio?': 'string',
  flags: [
    {
      userId: 'number',
      flagId: 'number',
      flag: {
        name: 'string'
      }
    }
  ],
  'role?': 'string',
  'email?': 'string.email'
});

const StaffUsers = type([StaffUser]);

export const load = (async () => {
  const users = StaffUsers(
    await db.query.users.findMany({
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
    })
  );

  if (users instanceof type.errors) {
    return fail(500);
  }

  const staff = users.filter((user) => user.flags.some((flag) => flag.flag.name === 'staff'));

  const sorting = {
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
    const roles = [];
    let email: string | undefined;

    if (staff.flags.some((flag) => flag.flag.name === 'chief')) {
      roles.push('FIR Chief');
      email = email ?? 'chief@czqm.ca';
    }
    if (staff.flags.some((flag) => flag.flag.name === 'deputy')) {
      roles.push('Deputy FIR Chief');
      email = email ?? 'deputy@czqm.ca';
    }
    if (staff.flags.some((flag) => flag.flag.name === 'chief-instructor')) {
      roles.push('Chief Instructor');
      email = email ?? 'instructor@czqm.ca';
    }
    if (staff.flags.some((flag) => flag.flag.name === 'web')) {
      roles.push('Webmaster');
      email = email ?? 'webmaster@czqm.ca';
    }
    if (staff.flags.some((flag) => flag.flag.name === 'events')) {
      roles.push('Events Coordinator');
      email = email ?? 'events@czqm.ca';
    }
    if (staff.flags.some((flag) => flag.flag.name === 'sector')) {
      roles.push('Facility Engineer');
      email = email ?? 'engineer@czqm.ca';
    }

    staff.role = roles.join(' & ');
    staff.email = email;
  });

  const trainingTeam = users.filter((u) => {
    return u.flags.some((f) => ['mentor', 'instructor', 'chief-instructor'].includes(f.flag.name));
  });

  return {
    staff,
    trainingTeam: [
      trainingTeam.find((u) => u.flags.some((f) => f.flag.name === 'chief-instructor')),
      ...trainingTeam
        .filter((u) => !u.flags.some((f) => f.flag.name === 'chief-instructor'))
        .sort((a, b) => {
          const aScore = a.flags.some((f) => f.flag.name === 'instructor') ? 1 : 0;
          const bScore = b.flags.some((f) => f.flag.name === 'instructor') ? 1 : 0;
          if (bScore !== aScore) return bScore - aScore;
          return a.name_full.localeCompare(b.name_full);
        })
    ]
  };
}) satisfies PageServerLoad;
