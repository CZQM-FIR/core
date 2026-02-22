import { query } from '$app/server';
import { db } from '$lib/db';
import { Event, User } from '@czqm/common';

export const getHomepageData = query(async () => {
  const [top5Controllers, events] = await Promise.all([
    User.fetchTopControllersForCurrentMonth(db, 5),
    Event.fetchUpcoming(db)
  ]);

  return {
    top5Controllers,
    events
  };
});
