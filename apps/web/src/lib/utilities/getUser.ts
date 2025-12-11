/**
 * User retrieval utilities
 * Following DIP: Uses shared access control logic
 * Following SRP: Only handles user data retrieval
 */
import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { getUserDisplayName as getDisplayName } from '@czqm/common/users';
import { hasPrivilegedAccess, type UserFlag } from '@czqm/common/roles';

/**
 * Get a user by CID with access control based on subject's permissions
 */
export const getUserByCID = async (cid: number, subjectCID: number | null = null) => {
  const hasAccess = await checkSubjectHasPrivilegedAccess(subjectCID);

  if (hasAccess) {
    return db.query.users.findFirst({
      where: eq(users.cid, cid),
      with: {
        rating: true,
        sessions: true,
        flags: true
      }
    });
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

/**
 * Get all users with access control based on subject's permissions
 */
export const getAllUsers = async (subjectCID: number | null = null) => {
  const hasAccess = await checkSubjectHasPrivilegedAccess(subjectCID);

  if (hasAccess) {
    return db.query.users.findMany({
      with: {
        rating: true,
        sessions: true,
        flags: true
      }
    });
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

/**
 * Check if a user has privileged access (instructor, mentor, or staff)
 */
async function checkSubjectHasPrivilegedAccess(subjectCID: number | null): Promise<boolean> {
  if (!subjectCID) return false;

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

  return subject ? hasPrivilegedAccess(subject.flags as UserFlag[]) : false;
}

/**
 * Get a user's display name by CID
 */
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

  return getDisplayName(user);
};
