import { eq } from 'drizzle-orm';
import { Position, positions, users, onlineSessions, notifications } from '@czqm/db/schema';
import type { DB, Env } from '@czqm/common';
import { User } from '@czqm/common';
import { unauthorizedConnectionEmailTemplate, unauthorizedConnectionText } from '@czqm/common/notifications';

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

const notifySession = async (session: Session, db: DB, env: Env) => {
  const user = await User.fromCid(db, session.cid);

  if (!user) {
    return;
  }

  const position = session.position;
  const t = session.logonTime;
  const hours = String(t.getUTCHours()).padStart(2, '0');
  const minutes = String(t.getUTCMinutes()).padStart(2, '0');

  const message = `📡 ${user.name_full} (${user.cid}) has connected to ${position.name} (${position.callsign}) at ${hours}:${minutes}z (<t:${Math.floor(session.logonTime.getTime() / 1000)}:R>).`;

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
  db: DB,
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

  console.log('Session notification sent to staff:', message);

  const discordIntegration = await db.query.integrations.findFirst({
    where: { cid: session.cid, type: 0 }
  });

  if (userData.length > 0) {
    await db.insert(notifications).values({
      timestamp: new Date(),
      type: 'unauthorizedConnection',
      userId: session.cid,
      location: 'email',
      message: unauthorizedConnectionEmailTemplate(session, userData[0], reasonText)
    });
  }

  if (discordIntegration) {
    await db.insert(notifications).values({
      timestamp: new Date(),
      type: 'unauthorizedConnection',
      userId: session.cid,
      message: `**Unauthorized Connection Detected**\n\n${unauthorizedConnectionText(session, user, reasonText)}`,
      buttons: [
        {
          type: 2,
          style: 5,
          label: 'Manage Notifications',
          url: `${env.PUBLIC_WEB_URL}/my/preferences`
        }
      ],
      location: 'discord'
    });
  }
};

export const handleOnlineSessions = async (db: DB, env: Env) => {
  const onlineControllersData = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
  const onlineControllersJson = (await onlineControllersData.json()) as {
    controllers: {
      cid: number;
      callsign: string;
      logon_time: string;
      rating: number;
    }[];
  };
  const onlineControllers = onlineControllersJson.controllers.map(
    (c: { cid: number; callsign: string; logon_time: string; rating: number }) => {
      return {
        cid: c.cid,
        callsign: c.callsign,
        start: c.logon_time,
        rating: c.rating
      };
    }
  ) as OnlineController[];

  console.log(`Fetched ${onlineControllers.length} online controllers from VATSIM.`);

  const czqmUsers = await User.fromFlag(db, ['controller', 'visitor']);

  const czqmControllers = czqmUsers.map((user) => user.cid);

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
      where: { userId: controller.cid, start: { eq: new Date(controller.start) } }
    });

    if (preExistingSession) {
      continue;
    } else {
      const position = allPositions.find((p) => p.callsign === controller.callsign);

      if (!position || controller.callsign.includes('OBS') || controller.callsign.includes('SUP'))
        continue;

      const user = czqmUsers.find((u) => u.cid === controller.cid);

      if (!user) continue;

      const discordIntegration = await db.query.integrations.findFirst({
        where: { cid: controller.cid, type: 0 },
        columns: {
          id: true
        }
      });

      const unitType = position.callsign.split('_').pop()?.toLowerCase() || '';

      const rosterUnit = unitType === 'del' || unitType === 'tmu' ? 'gnd' : unitType;
      const hasRosterAuthorization =
        (rosterUnit === 'gnd' ||
          rosterUnit === 'twr' ||
          rosterUnit === 'app' ||
          rosterUnit === 'ctr') &&
        user.getRosterStatus(rosterUnit) !== 'nothing';

      const session = {
        cid: controller.cid,
        position,
        logonTime: new Date(controller.start),
        rating: controller.rating
      };

      if (user.active !== 'active' || controller.rating === -1) {
        await notifyUnauthorizedSession(session, db, env, 'inactive');
      } else if (!discordIntegration) {
        await notifyUnauthorizedSession(session, db, env, 'discord');
      } else if (controller.rating === 0) {
        await notifyUnauthorizedSession(session, db, env, 'suspended');
      } else if (!hasRosterAuthorization && unitType !== 'obs') {
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
      where: { userId: controller.cid, start: { eq: new Date(controller.start) } }
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
