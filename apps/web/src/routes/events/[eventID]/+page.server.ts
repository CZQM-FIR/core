import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { events } from '@czqm/db/schema';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';

export const load = (async ({ params }) => {
  const eventID = params.eventID;

  const event = await db.query.events.findFirst({
    where: eq(events.id, Number(eventID))
  });

  if (!event) {
    redirect(303, '/events');
  }

  return {
    event
  };
}) satisfies PageServerLoad;
