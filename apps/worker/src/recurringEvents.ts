import { events } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { DB } from '.';

export const recurringEvents = async (db: DB) => {
  console.log('Checking recurring events for Updates...');

  const eventsData = await db.select().from(events).where(eq(events.recurring, true));

  if (eventsData.length === 0) {
    console.log('No recurring events found.');
    return;
  }

  for (const event of eventsData) {
    if (event.start.getTime() > Date.now()) {
      console.log('Recurring event is in the future, no updates needed.');
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

    console.log('Recurring event updated to next week:', updatedEvent.name);
  }

  console.log('Recurring events update completed.');
};
