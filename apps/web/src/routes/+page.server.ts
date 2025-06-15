import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async ({ locals }) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const controllers = await db.query.users.findMany({
    with: {
      sessions: {
        where: (sessions, { gte }) => gte(sessions.logonTime, startOfMonth)
      }
    },
    columns: {
      name_full: true,
      cid: true
    }
  });

  const controllersWithDuration = controllers.map((controller) => {
    const totalDuration = controller.sessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);
    return { ...controller, totalDuration };
  });

  const top5Controllers = controllersWithDuration
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 5);

  const events = await db.query.events.findMany({
    where: (events, { gte }) =>
      gte(events.end, new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
    orderBy: (events, { desc }) => desc(events.start)
  });

  return {
    user: locals.user,
    session: locals.session,
    top5Controllers,
    events
  };
}) satisfies PageServerLoad;
