import { Client } from '@libsql/client';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '@czqm/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Env } from '.';

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

export const vatcanPull = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
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
      flags: {
        with: {
          flag: true
        }
      }
    }
  });

  // remove controller and visitor flags from users who are no longer controllers or visitors
  for (const user of users) {
    if (user.flags.some((f) => f.flag.name === 'controller')) {
      if (!controllers.some((c) => c.cid === user.cid)) {
        await db.delete(schema.usersToFlags).where(
          and(
            eq(schema.usersToFlags.userId, user.cid),
            eq(schema.usersToFlags.flagId, 5) // controller
          )
        );
        user.flags = user.flags.filter((f) => f.flag.name !== 'controller');
      }
    }
    if (user.flags.some((f) => f.flag.name === 'visitor')) {
      if (!visitors.some((c) => c.cid === user.cid)) {
        await db.delete(schema.usersToFlags).where(
          and(
            eq(schema.usersToFlags.userId, user.cid),
            eq(schema.usersToFlags.flagId, 4) // visitor
          )
        );
        user.flags = user.flags.filter((f) => f.flag.name !== 'visitor');
      }
    }
  }

  for (const controller of controllers) {
    // Check if user already exists
    const existingUser = users.find((u) => u.cid === controller.cid);
    const isNewUser = !existingUser;

    await db
      .insert(schema.users)
      .values({
        cid: controller.cid,
        name_first: controller.first_name,
        name_last: controller.last_name,
        name_full: `${controller.first_name} ${controller.last_name}`,
        email: controller.email,
        ratingID: controller.rating
      })
      .onConflictDoUpdate({
        target: schema.users.cid,
        set: {
          name_first: controller.first_name,
          name_last: controller.last_name,
          name_full: `${controller.first_name} ${controller.last_name}`,
          email: controller.email,
          ratingID: controller.rating
        }
      });

    await db
      .insert(schema.usersToFlags)
      .values({
        userId: controller.cid,
        flagId: 5 // controller
      })
      .onConflictDoNothing();

    if (isNewUser && controller.rating === 2) {
      // if the controllers rating is 2 (S1), add them to the S1 waitlist
      const waitlist = await db.query.waitlists.findFirst({
        where: eq(schema.waitlists.id, 1),
        with: {
          students: true
        }
      });

      if (waitlist) {
        const isAlreadyWaiting = await db.query.waitingUsers.findFirst({
          where: and(
            eq(schema.waitingUsers.cid, controller.cid),
            eq(schema.waitingUsers.waitlistId, waitlist.id)
          )
        });

        if (!isAlreadyWaiting) {
          await db.insert(schema.waitingUsers).values({
            cid: controller.cid,
            waitlistId: 1,
            waitingSince: new Date(),
            position: waitlist.students.length
          });
        }
      }
    }

    console.log(
      `${isNewUser ? 'Inserted new' : 'Updated'} controller: ${controller.first_name} ${controller.last_name} (${controller.cid})`
    );
  }

  for (const controller of visitors) {
    await db
      .insert(schema.users)
      .values({
        cid: controller.cid,
        name_first: controller.first_name,
        name_last: controller.last_name,
        name_full: `${controller.first_name} ${controller.last_name}`,
        email: controller.email,
        ratingID: controller.rating
      })
      .onConflictDoUpdate({
        target: schema.users.cid,
        set: {
          name_first: controller.first_name,
          name_last: controller.last_name,
          name_full: `${controller.first_name} ${controller.last_name}`,
          email: controller.email,
          ratingID: controller.rating
        }
      });

    await db
      .insert(schema.usersToFlags)
      .values({
        userId: controller.cid,
        flagId: 4 // visitor
      })
      .onConflictDoNothing();

    console.log(
      `Inserted new visitor: ${controller.first_name} ${controller.last_name} (${controller.cid})`
    );
  }

  const staffPositions = {
    chief: 'chief',
    deputy: 'deputy',
    ci: 'chief-instructor',
    ec: 'events',
    fe: 'sector',
    wm: 'web'
  };

  const flagIDs = {
    chief: 23,
    deputy: 22,
    ci: 21,
    wm: 20,
    ec: 19,
    fe: 18
  };

  for await (const pos of Object.keys(staff) as (keyof typeof staffPositions)[]) {
    const posUsers = users.filter((u) => u.flags.some((f) => f.flag.name === staffPositions[pos]));
    if (posUsers.length === 0) {
      await db
        .insert(schema.usersToFlags)
        .values([
          {
            userId: staff[pos].cid,
            flagId: flagIDs[pos]
          },
          {
            userId: staff[pos].cid,
            flagId: 27 // staff
          }
        ])
        .onConflictDoNothing();

      console.log(
        `Inserted new staff: ${staff[pos].first_name} ${staff[pos].last_name} (${staff[pos].cid})`
      );
    } else {
      for await (const user of posUsers) {
        if (user.cid !== staff[pos].cid) {
          await db
            .delete(schema.usersToFlags)
            .where(
              and(
                eq(schema.usersToFlags.userId, user.cid),
                eq(schema.usersToFlags.flagId, flagIDs[pos])
              )
            );
          user.flags = user.flags.filter((f) => f.flag.name !== staffPositions[pos]);

          if (!user.flags.some((f) => Object.values(staffPositions).includes(f.flag.name))) {
            await db.delete(schema.usersToFlags).where(
              and(
                eq(schema.usersToFlags.userId, user.cid),
                eq(schema.usersToFlags.flagId, 27) // staff
              )
            );
          }
          console.log(
            `Removed ${staffPositions[pos]} flag from user: ${user.name_full} (${user.cid})`
          );
        }
      }
    }
  }
};
