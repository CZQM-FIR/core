import { invalidateSession } from '$lib/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  await invalidateSession(event.locals.session!.id);

  event.cookies.delete('session', { path: '/' });

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/'
    }
  });
};
