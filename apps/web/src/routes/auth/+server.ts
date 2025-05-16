import type { RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { VATSIM_CLIENT_ID, VATSIM_CLIENT_SECRET, VATSIM_URL } from '$env/static/private';
import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import {
  createSession,
  deleteSessionTokenCookie,
  generateSessionToken,
  setSessionTokenCookie,
  validateSessionToken
} from '$lib/auth';
import { db } from '$lib/db';

export const GET: RequestHandler = async (event): Promise<Response> => {
  const { url, cookies } = event;

  const sessionToken = cookies.get('session');
  if (sessionToken) {
    const result = await validateSessionToken(sessionToken);
    if (result.user && result.session) {
      let redirect = '/';
      if (event.cookies.get('redirect')) {
        redirect = event.cookies.get('redirect')!;
        event.cookies.delete('redirect', {
          path: '/'
        });
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirect
        }
      });
    } else {
      deleteSessionTokenCookie(event);
    }
  }

  if (!url.searchParams.has('code')) {
    if (url.searchParams.has('redirect')) {
      event.cookies.set('redirect', url.searchParams.get('redirect')!, {
        httpOnly: true,
        sameSite: 'lax',
        expires: new Date(Date.now() + 1000 * 60 * 5),
        path: '/'
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${VATSIM_URL}/oauth/authorize?client_id=${VATSIM_CLIENT_ID}&redirect_uri=${url.origin}/auth&response_type=code&scope=full_name vatsim_details email country`
      }
    });
  }

  const code = url.searchParams.get('code')!;
  const tokenResponse = await fetch(`${VATSIM_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: VATSIM_CLIENT_ID,
      client_secret: VATSIM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: `${url.origin}/auth`,
      code
    })
  });

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn
  } = (await tokenResponse.json()) as any;

  const userResponse = await fetch(`${VATSIM_URL}/api/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const user = ((await userResponse.json()) as any).data;

  const dbUser = await db.query.users.findFirst({
    where: eq(users.cid, user.cid)
  });

  if (dbUser) {
    await db
      .update(users)
      .set({
        email: user.personal.email,
        name_first: user.personal.name_first,
        name_last: user.personal.name_last,
        name_full: user.personal.name_full,
        division: user.vatsim.division?.id,
        region: user.vatsim.region?.id,
        subdivision: user.vatsim.subdivision?.id,
        ratingID: user.vatsim.rating.id
      })
      .where(eq(users.cid, user.cid));
  } else {
    await db.insert(users).values({
      cid: user.cid,
      email: user.personal.email,
      name_first: user.personal.name_first,
      name_last: user.personal.name_last,
      name_full: user.personal.name_full,
      division: user.vatsim.division?.id,
      region: user.vatsim.region?.id,
      subdivision: user.vatsim.subdivision?.id,
      ratingID: user.vatsim.rating.id
    });
  }

  const token = generateSessionToken();
  const session = createSession(token, user.cid);
  setSessionTokenCookie(event, token, (await session).expiresAt);

  let redirect = '/';
  if (event.cookies.get('redirect')) {
    redirect = event.cookies.get('redirect')!;
    event.cookies.delete('redirect', {
      path: '/'
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect
    }
  });
};
