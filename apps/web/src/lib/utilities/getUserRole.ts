import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';

export const getUserRole = (flags: { flag: { name: string } }[]) => {
  if (flags.some((flag) => flag.flag.name === 'chief')) return 'FIR Chief';
  else if (flags.some((flag) => flag.flag.name === 'deputy')) return 'Deputy FIR Chief';
  else if (flags.some((flag) => flag.flag.name === 'chief-instructor')) return 'Chief Instructor';
  else if (flags.some((flag) => flag.flag.name === 'web')) return 'Webmaster';
  else if (flags.some((flag) => flag.flag.name === 'events')) return 'Events Coordinator';
  else if (flags.some((flag) => flag.flag.name === 'sector')) return 'Facility Engineer';
  else if (flags.some((flag) => flag.flag.name === 'instructor')) return 'Instructor';
  else if (flags.some((flag) => flag.flag.name === 'mentor')) return 'Mentor';
  else if (
    flags.some((flag) => flag.flag.name === 'visitor') &&
    flags.some((flag) => flag.flag.name === 'inactive')
  )
    return 'Inacvtive Visitor';
  else if (
    flags.some((flag) => flag.flag.name === 'controller') &&
    flags.some((flag) => flag.flag.name === 'inactive')
  )
    return 'Inacvtive Home Controller';
  else if (flags.some((flag) => flag.flag.name === 'visitor')) return 'Visitor';
  else if (flags.some((flag) => flag.flag.name === 'controller')) return 'Home Controller';
  else return 'Guest';
};

export const getUserRoleByCID = async (cid: number) => {
  const user = await db.query.users.findFirst({
    where: eq(users.cid, cid),
    columns: {
      cid: true
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
  });

  if (!user) return 'Guest';

  return getUserRole(user.flags);
};
