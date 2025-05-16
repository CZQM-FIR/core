import { deleteSessionTokenCookie, invalidateSession } from '$lib/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  invalidateSession(event.locals.session!.id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
};
