import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '$lib/auth';

const r2: Handle = async ({ event, resolve }) => {
  event.locals.bucket = event.platform?.env.bucket as R2Bucket;
  return await resolve(event);
};

const session: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session') ?? null;
  if (token === null) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await validateSessionToken(token);
  if (session !== null) {
    setSessionTokenCookie(event, token, session.expiresAt);
  } else {
    deleteSessionTokenCookie(event);
  }

  event.locals.session = session;
  event.locals.user = user;
  return await resolve(event);
};

export const handle = sequence(r2, session);
