import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';

export const load = (async ({ params }) => {
  const eventID = params.eventID;

  const event = await db.query.events.findFirst({
    where: { id: Number(eventID) }
  });

  if (!event) {
    redirect(303, '/events');
  }

  return {
    event
  };
}) satisfies PageServerLoad;
