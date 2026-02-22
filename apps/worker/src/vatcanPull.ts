import type { DB, Env, FlagName } from '@czqm/common';
import {
  ensureUserFlag,
  ensureUserOnWaitlist,
  removeUserFlag,
  upsertRosterUser
} from '@czqm/common';

type VatcanApiUser = {
  cid: number;
  first_name: string;
  last_name: string;
  email: string;
  rating: number;
};

type VatcanApiStaffMember = VatcanApiUser & {};

type VatcanApiResponse = {
  data: {
    controllers: VatcanApiUser[];
    visitors: VatcanApiUser[];
    staff: Record<string, VatcanApiStaffMember>;
  };
};

export const vatcanPull = async (db: DB, env: Env) => {
  const data = await fetch('https://vatcan.ca/api/v2/facility/roster', {
    headers: {
      Authorization: `Token ${env.VATCAN_API_TOKEN}`
    }
  });

  if (!data.ok) {
    console.error('Failed to fetch data from vatcan:', data.statusText);
    return;
  }

  console.log('Data fetched successfully from vatcan');

  const { controllers, visitors, staff } = ((await data.json()) as VatcanApiResponse).data;

  const users = await db.query.users.findMany({
    with: {
      flags: true
    }
  });

  const existingUsersByCid = new Map(users.map((user) => [user.cid, user]));
  const controllerCids = new Set(controllers.map((controller) => controller.cid));
  const visitorCids = new Set(visitors.map((visitor) => visitor.cid));

  // remove all flags from users who are no longer controllers or visitors
  for (const user of users) {
    if (user.flags.some((f) => f.name === 'controller') && !controllerCids.has(user.cid)) {
      await removeUserFlag(db, user.cid, 'controller');
    }

    if (user.flags.some((f) => f.name === 'visitor') && !visitorCids.has(user.cid)) {
      await removeUserFlag(db, user.cid, 'visitor');
    }
  }

  for (const controller of controllers) {
    // Check if user already exists
    const existingUser = existingUsersByCid.get(controller.cid);
    const isNewUser = !existingUser;

    await upsertRosterUser(db, {
      cid: controller.cid,
      firstName: controller.first_name,
      lastName: controller.last_name,
      email: controller.email,
      ratingId: controller.rating
    });

    await ensureUserFlag(db, controller.cid, 'controller');

    if (isNewUser && controller.rating === 2) {
      // if the controllers rating is 2 (S1), add them to the S1 waitlist
      await ensureUserOnWaitlist(db, {
        cid: controller.cid,
        waitlistName: 'S1'
      });
    }

    console.log(
      `${isNewUser ? 'Inserted new' : 'Updated'} controller: ${controller.first_name} ${controller.last_name} (${controller.cid})`
    );
  }

  for (const visitor of visitors) {
    await upsertRosterUser(db, {
      cid: visitor.cid,
      firstName: visitor.first_name,
      lastName: visitor.last_name,
      email: visitor.email,
      ratingId: visitor.rating
    });

    await ensureUserFlag(db, visitor.cid, 'visitor');

    console.log(
      `Inserted new visitor: ${visitor.first_name} ${visitor.last_name} (${visitor.cid})`
    );
  }

  const staffPositions = {
    chief: 'chief',
    deputy: 'deputy',
    ci: 'chief-instructor',
    ec: 'events',
    fe: 'sector',
    wm: 'web'
  } as const satisfies Record<string, FlagName>;

  const usersWithFlags = await db.query.users.findMany({
    with: {
      flags: true
    }
  });

  const staffPositionFlags: FlagName[] = Object.values(staffPositions);

  for (const [positionKey, flagName] of Object.entries(staffPositions)) {
    const assignedStaffUser = staff[positionKey];

    if (!assignedStaffUser) {
      continue;
    }

    const currentUsersForPosition = usersWithFlags.filter((user) =>
      user.flags.some((flag) => flag.name === flagName)
    );

    for (const user of currentUsersForPosition) {
      if (user.cid === assignedStaffUser.cid) {
        continue;
      }

      await removeUserFlag(db, user.cid, flagName);

      const refreshedUser = await db.query.users.findFirst({
        where: { cid: user.cid },
        with: {
          flags: true
        }
      });

      if (
        refreshedUser &&
        !refreshedUser.flags.some((flag) => staffPositionFlags.includes(flag.name as FlagName))
      ) {
        await removeUserFlag(db, user.cid, 'staff');
      }

      console.log(`Removed ${flagName} flag from user: ${user.name_full} (${user.cid})`);
    }

    await upsertRosterUser(db, {
      cid: assignedStaffUser.cid,
      firstName: assignedStaffUser.first_name,
      lastName: assignedStaffUser.last_name,
      email: assignedStaffUser.email,
      ratingId: assignedStaffUser.rating
    });

    await ensureUserFlag(db, assignedStaffUser.cid, flagName);
    await ensureUserFlag(db, assignedStaffUser.cid, 'staff');

    console.log(
      `Synced staff ${flagName}: ${assignedStaffUser.first_name} ${assignedStaffUser.last_name} (${assignedStaffUser.cid})`
    );
  }
};
