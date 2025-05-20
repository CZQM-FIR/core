import { Client } from '@libsql/client/.';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '@czqm/db/schema';
import { eq, or } from 'drizzle-orm';

export const vatcanPull = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
  console.log('Pulling from vatcan...');

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

  const { controllers, visitors, staff } = ((await data.json()) as any).data;

  const users = await db.query.users.findMany({
    with: {
      flags: {
        with: {
          flag: true
        }
      }
    }
  });

  for (const controller of controllers
    .filter(
      (c: any) =>
        !users.some((u) => u.cid === c.cid) ||
        !users.find((u) => u.cid === c.cid)?.flags.some((f) => f.flag.name === 'controller')
    )
    .slice(0, 20)) {
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
    console.log(2);

    await db
      .insert(schema.usersToFlags)
      .values({
        userId: controller.cid,
        flagId: 5 // controller
      })
      .onConflictDoNothing();

    console.log(
      `Inserted new controller: ${controller.first_name} ${controller.last_name} (${controller.cid})`
    );
  }

  for (const controller of visitors
    .filter(
      (c: any) =>
        !users.some((u) => u.cid === c.cid) ||
        !users.find((u) => u.cid === c.cid)?.flags.some((f) => f.flag.name === 'visitor')
    )
    .slice(0, 20)) {
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

  for (const pos of Object.keys(staff) as (keyof typeof staffPositions)[]) {
    const posUsers = users.filter((u) => u.flags.some((f) => f.flag.name === staffPositions[pos]));
    for (const user of posUsers) {
      if (user) {
        if (user.cid !== staff[pos].cid) {
          await db
            .delete(schema.usersToFlags)
            .where(
              or(
                eq(schema.usersToFlags.userId, user.cid),
                eq(schema.usersToFlags.flagId, flagIDs[pos])
              )
            );
        }
      } else {
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
      }
    }
  }
};
