import { and, eq } from 'drizzle-orm';
import { Position, positions, sessions, users } from '@czqm/db/schema';
import { Client } from '@libsql/client';
import { LibSQLDatabase } from 'drizzle-orm/libsql';

const positionPrefixes = [
  'CZQM',
  'CZQX',
  'CYHZ',
  'CYQM',
  'CYYR',
  'CYZX',
  'CYYT',
  'CYFC',
  'CYZX',
  'LFVP',
  'CYSJ',
  'CYDF',
  'CYYG'
];

type VatsimController = {
  cid: number;
  name: string;
  callsign: string;
  frequency: string;
  facility: number;
  rating: number;
  server: string;
  visual_range: number;
  text_atis: string[];
  last_updated: string;
  logon_time: string;
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

  console.log(env.DISCORD_WEBHOOK_URL.split('/'));

  await fetch(env.DISCORD_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: message,
      token: env.DISCORD_WEBHOOK_URL.split('/').pop()
    })
  });

  console.log('Session notification sent:', message);
};

export const handleRecordSessions = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client },
  env: Env
) => {
  const controllers = (
    (await (await fetch('https://data.vatsim.net/v3/vatsim-data.json')).json()) as any
  ).controllers as VatsimController[];

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

  const czqmControllersOnline = controllers.filter(
    (c) => czqmControllers.includes(c.cid) && c.frequency !== '199.998'
  );

  const allPositions = await db.query.positions.findMany();

  for (const controller of czqmControllersOnline) {
    const currentSession = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.userId, controller.cid),
        eq(sessions.logonTime, new Date(controller.logon_time))
      )
    });

    if (currentSession) {
      // session already exists
      console.log('Session already exists', controller.callsign, controller.cid);

      await db
        .update(sessions)
        .set({
          duration:
            Math.floor(Date.now() / 1000) -
            Math.floor(new Date(controller.logon_time).getTime() / 1000)
        })
        .where(eq(sessions.id, currentSession.id));
    } else {
      console.log('Session does not exist', controller.callsign, controller.cid);

      const position = allPositions.find((p) => p.callsign === controller.callsign);

      console.log('Position', position);

      if (!position) {
        if (!positionPrefixes.includes(controller.callsign.split('_')[0])) {
          console.log('Not a position we care about', controller.callsign, controller.cid);
          // not a position we care about but a user we care about
          await db.insert(sessions).values({
            userId: controller.cid,
            positionId: 0,
            logonTime: new Date(controller.logon_time),
            duration:
              Math.floor(Date.now() / 1000) -
              Math.floor(new Date(controller.logon_time).getTime() / 1000)
          });
        } else {
          // a position we do not yet track but should
          const newPosition = (
            await db
              .insert(positions)
              .values({
                callsign: controller.callsign,
                name: controller.callsign,
                frequency: controller.frequency
              })
              .returning()
          )[0];

          await db.insert(sessions).values({
            userId: controller.cid,
            positionId: newPosition.id,
            logonTime: new Date(controller.logon_time),
            duration:
              Math.floor(Date.now() / 1000) -
              Math.floor(new Date(controller.logon_time).getTime() / 1000)
          });
        }
      } else {
        // a position we do track

        await db.insert(sessions).values({
          userId: controller.cid,
          positionId: position.id,
          logonTime: new Date(controller.logon_time),
          duration:
            Math.floor(Date.now() / 1000) -
            Math.floor(new Date(controller.logon_time).getTime() / 1000)
        });

        await notifySession(
          {
            cid: controller.cid,
            position: position,
            logonTime: new Date(controller.logon_time)
          },
          db,
          env
        );
      }
    }
  }
};
