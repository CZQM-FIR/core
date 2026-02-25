import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { User } from '@czqm/common';

export const load = (async () => {
  const staffUsers = await User.fromFlag(db, 'staff');
  const instructorUsers = await User.fromFlag(db, 'instructor');
  const mentorUsers = await User.fromFlag(db, 'mentor');

  const sorting = {
    chief: 5,
    deputy: 4,
    'chief-instructor': 3,
    events: 2,
    sector: 1,
    web: 0
  };

  staffUsers.sort((a, b) => {
    let aScore = 0;
    let bScore = 0;

    for (const flag of a.flags) {
      if (flag.name in sorting)
        aScore = Math.max(aScore, sorting[flag.name as keyof typeof sorting]);
    }

    for (const flag of b.flags) {
      if (flag.name in sorting)
        bScore = Math.max(bScore, sorting[flag.name as keyof typeof sorting]);
    }

    return bScore - aScore;
  });

  const staff: {
    name: string;
    role: string;
    email: string;
    cid: number;
    bio: string;
  }[] = [];

  staffUsers.forEach((user) => {
    const roles = [];
    let email: string | undefined;

    if (user.hasFlag('chief')) {
      roles.push('FIR Chief');
      email = email ?? 'chief@czqm.ca';
    }
    if (user.hasFlag('deputy')) {
      roles.push('Deputy FIR Chief');
      email = email ?? 'deputy@czqm.ca';
    }
    if (user.hasFlag('chief-instructor')) {
      roles.push('Chief Instructor');
      email = email ?? 'instructor@czqm.ca';
    }
    if (user.hasFlag('web')) {
      roles.push('Webmaster');
      email = email ?? 'webmaster@czqm.ca';
    }
    if (user.hasFlag('events')) {
      roles.push('Events Coordinator');
      email = email ?? 'events@czqm.ca';
    }
    if (user.hasFlag('sector')) {
      roles.push('Facility Engineer');
      email = email ?? 'engineer@czqm.ca';
    }

    staff.push({
      email: email ?? user.email,
      name: user.displayName,
      role: roles.join(' & '),
      cid: user.cid,
      bio: user.bio || ''
    });
  });

  const trainingTeam = [...instructorUsers, ...mentorUsers];

  const chiefInstructor = (await User.fromFlag(db, 'chief-instructor'))[0];

  return {
    staff,
    trainingTeam: [
      ...(chiefInstructor ? [chiefInstructor] : []),
      ...trainingTeam
        .filter((u) => !u.flags.some((f) => f.name === 'chief-instructor'))
        .sort((a, b) => {
          const aScore = a.flags.some((f) => f.name === 'instructor') ? 1 : 0;
          const bScore = b.flags.some((f) => f.name === 'instructor') ? 1 : 0;
          if (bScore !== aScore) return bScore - aScore;
          return a.name_full.localeCompare(b.name_full);
        })
    ]
  };
}) satisfies PageServerLoad;
