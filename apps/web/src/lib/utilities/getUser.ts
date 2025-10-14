import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { getUserDisplayName } from './getUserDisplayName';

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

export const getUserDisplayNameByCID = async (cid: number): Promise<string> => {
  const user = await db.query.users.findFirst({
    where: eq(users.cid, cid),
    with: {
      preferences: true
    }
  });

  if (!user) {
    return cid.toString();
  }

  return getUserDisplayName(user);
};

export const getUserDisplayName = async (cid: number): Promise<string> => {
  const user = await db.query.users.findFirst({
    where: eq(users.cid, cid),
    columns: {
      name_first: true,
      name_last: true,
      name_full: true,
      cid: true
    },
    with: {
      preferences: true
    }
  });

  if (!user) {
    return cid.toString();
  }

  const namePreference = user?.preferences.find((p) => p.key === 'displayName')?.value || 'full';

  switch (namePreference) {
    case 'full':
      return user.name_full;
    case 'initial':
      return `${user.name_first} ${user.name_last[0].toUpperCase()}.`;
    case 'cid':
      return user.cid.toString();
    default:
      return user.name_full;
  }
};
