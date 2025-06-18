import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { deleteSessionTokenCookie, setSessionTokenCookie, validateSessionToken } from '$lib/auth';

Sentry.init({
  dsn: 'https://b376dc242af4dd9e5e641df53e36d76f@o4509517547044864.ingest.us.sentry.io/4509517550387200',
  tracesSampleRate: 1
});

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

export const handle = sequence(Sentry.sentryHandle(), session);
export const handleError = Sentry.handleErrorWithSentry();
