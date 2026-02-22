import { query } from '$app/server';
import { db } from '$lib/db';
import { Event } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';

export const getEventsSplit = query(async () => {
  return await Event.fetchSplitByCurrentTime(db);
});

export const getEvent = query(type('number.integer >= 0'), async (id) => {
  const event = await Event.fetchById(db, id);

  if (!event) {
    throw error(404, 'Event not found');
  }

  return event;
});
