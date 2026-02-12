import { events } from '@czqm/db/schema';
import { desc } from 'drizzle-orm';
import { db } from '$lib/db';

export const getAllEvents = async () => {
  const eventData = db.query.events.findMany({
    orderBy: [desc(events.start)]
  });

  return eventData;
};

export const getEventById = async (id: number) => {
  const event = db.query.events.findFirst({
    where: { id }
  });

  return event;
};
