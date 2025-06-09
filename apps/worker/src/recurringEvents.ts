import { Client } from '@libsql/client/.';
import { LibSQLDatabase } from 'drizzle-orm/libsql';
import { events } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';

export const recurringEvents = async (
  db: LibSQLDatabase<typeof import('@czqm/db/schema')> & { $client: Client }
) => {
  console.log('Checking Moncton Monday for Updates...');

  const eventsData = await db
    .select()
    .from(events)
    .where(eq(events.name, 'Moncton Monday'))
    .limit(1);

  if (eventsData.length === 0) {
    console.log('No Moncton Monday event found.');
    return;
  }

  const event = eventsData[0];

  if (event.start.getTime() > Date.now()) {
    console.log('Moncton Monday event is in the future, no updates needed.');
    return;
  }

  const updatedEvent = {
    ...event,
    start: new Date(event.start.getTime() + 7 * 24 * 60 * 60 * 1000), // Add one week
    end: new Date(event.end.getTime() + 7 * 24 * 60 * 60 * 1000) // Add one week
  };

  await db
    .update(events)
    .set({
      start: updatedEvent.start,
      end: updatedEvent.end
    })
    .where(eq(events.id, event.id));

  console.log('Moncton Monday event updated to next week:', updatedEvent);
};
