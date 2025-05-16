import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async () => {
  const events = await db.query.events.findMany();

  const upcomingEvents = events.filter((event) => new Date(event.end) > new Date());
  const pastEvents = events.filter((event) => new Date(event.end) <= new Date());

  return {
    upcomingEvents,
    pastEvents
  };
}) satisfies PageServerLoad;
