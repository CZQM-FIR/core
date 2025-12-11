/**
 * User role utilities
 * Following DIP: Uses shared role logic
 * Following OCP: Role priority can be extended via constants
 */
import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/db';
import { getUserRole as getRole, type UserFlag } from '@czqm/common/roles';

// Re-export with same signature for backward compatibility
export const getUserRole = (flags: { flag: { name: string } }[]): string => {
  return getRole(flags as UserFlag[]);
};

export const getUserRoleByCID = async (cid: number): Promise<string> => {
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
