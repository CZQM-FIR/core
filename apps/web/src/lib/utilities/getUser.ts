import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';

export const getUserByCID = async (cid: number, subjectCID: number | null = null) => {
  if (subjectCID) {
    const subject = await db.query.users.findFirst({
      where: eq(users.cid, subjectCID),
      with: {
        flags: {
          with: {
            flag: true
          }
        }
      }
    });

    if (
      subject &&
      subject.flags.some((f) => ['instructor', 'mentor', 'staff'].includes(f.flag.name))
    ) {
      return db.query.users.findFirst({
        where: eq(users.cid, cid),
        with: {
          rating: true,
          sessions: true,
          flags: true
        }
      });
    }
  }

  return db.query.users.findFirst({
    where: eq(users.cid, cid),
    columns: {
      email: false
    },
    with: {
      rating: true,
      sessions: true,
      flags: true
    }
  });
};

export const getAllUsers = async (subjectCID: number | null = null) => {
  if (subjectCID) {
    const subject = await db.query.users.findFirst({
      where: eq(users.cid, subjectCID),
      with: {
        flags: {
          with: {
            flag: true
          }
        }
      }
    });

    if (
      subject &&
      subject.flags.some((f) => ['instructor', 'mentor', 'staff'].includes(f.flag.name))
    ) {
      return db.query.users.findMany({
        with: {
          rating: true,
          sessions: true,
          flags: true
        }
      });
    }
  }

  return db.query.users.findMany({
    columns: {
      email: false
    },
    with: {
      rating: true,
      sessions: true,
      flags: true
    }
  });
};
