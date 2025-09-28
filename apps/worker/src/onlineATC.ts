import { and, eq } from 'drizzle-orm';
import { Position, positions, users, onlineSessions, roster, integrations } from '@czqm/db/schema';
import { Client } from '@libsql/client';
import { LibSQLDatabase } from 'drizzle-orm/libsql';

type OnlineController = {
  cid: number;
  callsign: string;
  start: string;
  rating: number;
};

type Session = {
  cid: number;
  position: Position;
  logonTime: Date;
};

const notifySession = async (
  session: Session,
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
  const userData = await db.select().from(users).where(eq(users.cid, session.cid)).limit(1);

  if (userData.length === 0) {
    return;
  }

  const user = userData[0];

  const positionData = await db
    .select()
    .from(positions)
    .where(eq(positions.id, session.position.id))
    .limit(1);
  if (positionData.length === 0) {
    return;
  }

  const position = positionData[0];

  const message = `📡 ${user.name_full} (${user.cid}) has connected to ${position.name} (${position.callsign}) at ${session.logonTime.toLocaleTimeString()} (<t:${Math.floor(session.logonTime.getTime() / 1000)}:R>).`;

  await fetch(env.WEBHOOK_ONLINE_CONTROLLERS!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      token: env.WEBHOOK_ONLINE_CONTROLLERS.split('/').pop()
    })
  });

  console.log('Session notification sent:', message);
};

const notifyUnauthorizedSession = async (
  session: Session,
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env,
  reason: 'discord' | 'inactive' | 'roster' | 'suspended' | 'nonczqm'
) => {
  const userData = await db.select().from(users).where(eq(users.cid, session.cid)).limit(1);

  const user = userData.length > 0 ? userData[0] : { name_full: 'Name Unknown', cid: session.cid };

  const positionData = await db
    .select()
    .from(positions)
    .where(eq(positions.id, session.position.id))
    .limit(1);
  if (positionData.length === 0) {
    return;
  }

  const position = positionData[0];

  let reasonText: string;
  switch (reason) {
    case 'discord':
      reasonText = 'No Discord Account linked';
      break;
    case 'inactive':
      reasonText = 'User is marked as Inactive';
      break;
    case 'roster':
      reasonText = 'User does not have correct authorization on the roster';
      break;
    case 'suspended':
      reasonText = 'User is Suspended on VATSIM';
      break;
    case 'nonczqm':
      reasonText = 'User is not a CZQM member';
      break;
    default:
      reasonText = 'Unknown reason';
  }

  const message = `⚠️⚠️ ${user.name_full} (${user.cid}) has started an UNAUTHORIZED connection to ${position.name} (${position.callsign}) at ${session.logonTime.toLocaleTimeString()} (<t:${Math.floor(session.logonTime.getTime() / 1000)}:R>). Reason: ${reasonText} ⚠️⚠️`;

  await fetch(env.WEBHOOK_UNAUTHORIZED_CONTROLLER!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      token: env.WEBHOOK_UNAUTHORIZED_CONTROLLER.split('/').pop()
    })
  });

  console.log('Session notification sent:', message);
};

export const handleOnlineSessions = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
  const onlineControllersData = await fetch('https://api.vatsim.net/v2/atc/online');
  const onlineControllers = (
    (await onlineControllersData.json()) as {
      id: number;
      callsign: string;
      start: string;
      rating: number;
    }[]
  ).map((c: { id: number; callsign: string; start: string; rating: number }) => {
    return {
      cid: c.id,
      callsign: c.callsign,
      start: c.start,
      rating: c.rating
    };
  }) as OnlineController[];

  console.log(`Fetched ${onlineControllers.length} online controllers from VATSIM.`);

  const allUsers = await db.query.users.findMany({
    columns: {
      cid: true
    },
    with: {
      flags: {
        with: {
          flag: true
        }
      }
    }
  });

  const czqmControllers = allUsers
    .filter((c) => {
      return c.flags.some(({ flagId }) => flagId === 4 || flagId === 5);
    })
    .map((c) => c.cid);

  const czqmControllersOnline = onlineControllers.filter((c) => czqmControllers.includes(c.cid));

  console.log(`Found ${czqmControllersOnline.length} CZQM controllers online.`);

  const allPositions = await db.query.positions.findMany();

  const nonCzqmControllersOnline = onlineControllers
    .filter((c) => !czqmControllers.includes(c.cid))
    .filter((c) => {
      return allPositions.find((p) => p.callsign === c.callsign);
    });

  console.log(`Found ${nonCzqmControllersOnline.length} non-CZQM controllers online.`);

  for await (const controller of czqmControllersOnline) {
    const preExistingSession = await db.query.onlineSessions.findFirst({
      where: and(
        eq(onlineSessions.userId, controller.cid),
        eq(onlineSessions.start, new Date(controller.start))
      )
    });

    if (preExistingSession) {
      continue;
    } else {
      const position = allPositions.find((p) => p.callsign === controller.callsign);

      if (!position) continue;

      const userData = await db.query.users.findFirst({
        where: eq(users.cid, controller.cid),
        columns: {
          active: true,
          cid: true,
          name_full: true
        },
        with: {
          integrations: {
            where: eq(integrations.type, 0)
          }
        }
      });

      if (!userData) continue;

      const rosterDataPoints = await db.query.roster.findMany({
        where: eq(roster.controllerId, controller.cid)
      });

      const rosterData = rosterDataPoints.filter(
        (r) => r.position === position.callsign.split('_').pop()?.toLowerCase()
      )[0];

      const session = {
        cid: controller.cid,
        position,
        logonTime: new Date(controller.start),
        rating: controller.rating
      };

      if (!userData.active) {
        await notifyUnauthorizedSession(session, db, env, 'inactive');
      } else if (userData.integrations.length === 0) {
        await notifyUnauthorizedSession(session, db, env, 'discord');
      } else if (controller.rating === 1) {
        await notifyUnauthorizedSession(session, db, env, 'suspended');
      } else if (
        (!rosterData || rosterData.status === -1) &&
        position.callsign.split('_').pop()?.toLowerCase() !== 'obs'
      ) {
        await notifyUnauthorizedSession(session, db, env, 'roster');
      } else {
        await notifySession(session, db, env);
      }

      try {
        await db.insert(onlineSessions).values({
          userId: controller.cid,
          positionId: position.id,
          start: new Date(controller.start)
        });
      } catch (error) {
        console.error('Failed to insert online session:', error);
        console.error('Values attempted:', {
          userId: controller.cid,
          positionId: position.id,
          start: new Date(controller.start)
        });
      }
    }
  }

  for await (const controller of nonCzqmControllersOnline) {
    const preExsittingSession = await db.query.onlineSessions.findFirst({
      where: and(
        eq(onlineSessions.userId, controller.cid),
        eq(onlineSessions.start, new Date(controller.start))
      )
    });

    if (preExsittingSession) {
      continue;
    } else {
      const position = allPositions.find((p) => p.callsign === controller.callsign);

      if (!position) continue;

      const session = {
        cid: controller.cid,
        position,
        logonTime: new Date(controller.start),
        rating: controller.rating
      };

      await notifyUnauthorizedSession(session, db, env, 'nonczqm');

      console.log(new Date(controller.start));

      try {
        await db.insert(onlineSessions).values({
          userId: controller.cid,
          positionId: position.id,
          start: new Date(controller.start)
        });
      } catch (error) {
        console.error('Failed to insert online session for non-CZQM controller:', error);
        console.error('Values attempted:', {
          userId: controller.cid,
          positionId: position.id,
          start: new Date(controller.start)
        });
      }
    }
  }
};
