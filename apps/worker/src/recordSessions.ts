import * as schema from '@czqm/db/schema';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { DB, Env, User } from '@czqm/common';

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

const VatsimSessions = type({
  items: type({
    connection_id: {
      id: 'number.integer',
      vatsim_id: 'string.integer' as type.cast<number>,
      rating: 'number.integer',
      callsign: 'string',
      start: type('string').pipe((s) => new Date(s)),
      end: type('string').pipe((s) => new Date(s))
    },
    aircrafttracked: 'number.integer',
    aircraftseen: 'number.integer',
    flightsamended: 'number.integer',
    handoffsinitiated: 'number.integer',
    handoffsreceived: 'number.integer',
    handoffsrefused: 'number.integer',
    squawksassigned: 'number.integer',
    cruisealtsmodified: 'number.integer',
    tempaltsmodified: 'number.integer',
    scratchpadmods: 'number.integer'
  }).array(),
  count: 'number.integer>=0'
});

export const handleRecordSessions = async (db: DB, env: Env) => {
  // get list of all czqm controllers and visitors
  const allControllers = await User.fromFlag(db, ['controller', 'visitor']);

  const sortedControllers = allControllers.sort(
    (a, b) => b.hoursLastUpdated.getTime() - a.hoursLastUpdated.getTime()
  );

  console.log(`Found ${sortedControllers.length} controllers to update sessions for`);

  const positions = await db.query.positions.findMany({});

  for await (const controller of sortedControllers) {
    // fetch their sessions from vatsim
    const fetchedSessions = [];
    let count = 1;
    let offset = 0;

    while (fetchedSessions.length < count) {
      const sessionsData = await fetch(
        `https://api.vatsim.net/v2/members/${controller.cid}/atc?offset=${offset}&limit=1000`
      );
      const sessionsJson = await sessionsData.json();
      const sessionsParsed = VatsimSessions(sessionsJson);

      if (sessionsParsed instanceof type.errors) {
        throw new Error(
          `Failed to parse VATSIM sessions for user ${controller.cid}: ${sessionsParsed.summary}`
        );
      }

      count = sessionsParsed.count;
      fetchedSessions.push(...sessionsParsed.items);
      offset += 1000;
    }

    console.log(`Fetched ${fetchedSessions.length} sessions for user ${controller.cid}`);

    const czqmSessions = fetchedSessions.filter((s) => {
      // filter to only czqm positions
      return positionPrefixes.some((prefix) =>
        s.connection_id.callsign.toUpperCase().startsWith(prefix)
      );
    });
    const externalSessions = fetchedSessions.filter((s) => {
      return !positionPrefixes.some((prefix) =>
        s.connection_id.callsign.toUpperCase().startsWith(prefix)
      );
    });

    const czqmValues = await Promise.all(
      czqmSessions.map(async (s) => {
        let positionId: number;
        if (positions.some((p) => p.callsign === s.connection_id.callsign)) {
          positionId = positions.find((p) => p.callsign === s.connection_id.callsign)!.id;
        } else {
          // First try to find if the position already exists in the database
          let position = await db.query.positions.findFirst({
            where: { callsign: s.connection_id.callsign }
          });

          if (!position) {
            // Only insert if it doesn't exist
            try {
              await db.insert(schema.positions).values({
                callsign: s.connection_id.callsign,
                name: s.connection_id.callsign,
                frequency: '199.998'
              });

              // Fetch the newly created position
              position = await db.query.positions.findFirst({
                where: { callsign: s.connection_id.callsign }
              });
            } catch (error) {
              // If insert fails, try to fetch again (race condition)
              position = await db.query.positions.findFirst({
                where: { callsign: s.connection_id.callsign }
              });

              if (!position) {
                throw error;
              }
            }
          }

          if (!position) {
            throw new Error(
              `Failed to create or find position with callsign: ${s.connection_id.callsign}`
            );
          }

          positionId = position.id;
          // Add to positions array for future reference
          positions.push(position);
        }

        return {
          id: s.connection_id.id,
          userId: controller.cid,
          positionId: positionId,
          duration: Math.floor(
            (s.connection_id.end.getTime() - s.connection_id.start.getTime()) / 1000
          ),
          logonTime: s.connection_id.start,
          ratingId: s.connection_id.rating,
          aircraftTracked: s.aircrafttracked,
          aircraftSeen: s.aircraftseen,
          flightsAmended: s.flightsamended,
          handoffsInitiated: s.handoffsinitiated,
          handoffsReceived: s.handoffsreceived,
          handoffsRefused: s.handoffsrefused,
          squawksAssigned: s.squawksassigned,
          cruiseAltsModified: s.cruisealtsmodified,
          tempAltsModified: s.tempaltsmodified,
          scratchpadMods: s.scratchpadmods
        };
      })
    );
    const externalValues = externalSessions.map((s) => {
      return {
        id: s.connection_id.id,
        userId: controller.cid,
        positionId: 0,
        duration: Math.floor(
          (s.connection_id.end.getTime() - s.connection_id.start.getTime()) / 1000
        ),
        logonTime: s.connection_id.start,
        ratingId: s.connection_id.rating,
        aircraftTracked: s.aircrafttracked,
        aircraftSeen: s.aircraftseen,
        flightsAmended: s.flightsamended,
        handoffsInitiated: s.handoffsinitiated,
        handoffsReceived: s.handoffsreceived,
        handoffsRefused: s.handoffsrefused,
        squawksAssigned: s.squawksassigned,
        cruiseAltsModified: s.cruisealtsmodified,
        tempAltsModified: s.tempaltsmodified,
        scratchpadMods: s.scratchpadmods
      };
    });

    const allValues = [...czqmValues, ...externalValues];
    if (allValues.length > 0) {
      // Batch insertions into groups of 500
      const batchSize = 500;
      for (let i = 0; i < allValues.length; i += batchSize) {
        const batch = allValues.slice(i, i + batchSize);
        await db.insert(schema.sessions).values(batch).onConflictDoNothing();

        console.log(
          `Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allValues.length / batchSize)} (${batch.length} sessions) for user ${controller.cid}`
        );
      }
    }
    await db
      .update(schema.users)
      .set({ hoursLastUpdated: new Date() })
      .where(eq(schema.users.cid, controller.cid));

    console.log(
      `Inserted ${czqmValues.length + externalValues.length} sessions for user ${controller.cid} (${czqmValues.length} CZQM, ${externalValues.length} external)`
    );

    // delay between users to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, env.RECORD_SESSIONS_DELAY || 5000));
  }
};
