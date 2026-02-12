import { db } from '$lib/db';
import { getUserDisplayName } from './getUserDisplayName';

export const getUserByCID = async (cid: number, subjectCID: number | null = null) => {
  if (subjectCID) {
    const subject = await db.query.users.findFirst({
      where: { cid: subjectCID },
      with: {
        flags: true
      }
    });

    if (subject && subject.flags.some((f) => ['instructor', 'mentor', 'staff'].includes(f.name))) {
      return db.query.users.findFirst({
        where: { cid },
        with: {
          rating: true,
          sessions: true,
          flags: true
        }
      });
    }
  }

  return db.query.users.findFirst({
    where: { cid },
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
      where: { cid: subjectCID },
      with: {
        flags: true
      }
    });

    if (subject && subject.flags.some((f) => ['instructor', 'mentor', 'staff'].includes(f.name))) {
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

export const getUserDisplayNameByCID = async (cid: number): Promise<string> => {
  const user = await db.query.users.findFirst({
    where: { cid },
    with: {
      preferences: true
    }
  });

  if (!user) {
    return cid.toString();
  }

  return getUserDisplayName(user);
};
