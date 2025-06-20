import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { type } from 'arktype';
import { db } from '$lib/db';
import { integrations } from '@czqm/db/schema';

const {
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  DISCORD_GUILD_ID,
  DISCORD_REDIRECT_URI
} = env;

export const GET: RequestHandler = async ({ url, locals }) => {
  const SearchParams = type({
    code: 'string'
  });

  const params = SearchParams(Object.fromEntries(url.searchParams.entries()));
  if (params instanceof type.errors) {
    console.error('Invalid search parameters:', params.summary);
    return new Response('Invalid search parameters', { status: 400 });
  }
  const { code } = params;

  if (!code || !locals.user) {
    redirect(303, '/my/integrations');
  }

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI
    })
  });

  if (!tokenResponse.ok) {
    console.error('Failed to exchange code for token:', await tokenResponse.text());
    return new Response('Failed to link Discord account', { status: 500 });
  }

  const TokenData = type({
    token_type: "'Bearer'",
    access_token: 'string',
    expires_in: 'number.integer > 0',
    refresh_token: 'string',
    scope: type('string')
      .pipe((v) => v.split(' '))
      .to('string[]')
  });

  const tokenData = TokenData(await tokenResponse.json());

  if (tokenData instanceof type.errors) {
    console.error('Invalid token data:', tokenData.summary);
    return new Response('Invalid token data', { status: 500 });
  }

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `${tokenData.token_type} ${tokenData.access_token}`
    }
  });

  const UserData = type({
    id: 'string.integer',
    username: 'string'
  });

  const userData = UserData(await userResponse.json());

  if (userData instanceof type.errors) {
    console.error('Invalid user data:', userData.summary);
    return new Response('Invalid user data', { status: 500 });
  }

  await db.insert(integrations).values({
    cid: locals.user.cid,
    type: 0,
    integrationUserId: userData.id,
    integrationUserName: userData.username
  });

  await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userData.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      access_token: tokenData.access_token,
      nick: locals.user.name_full
    })
  });

  return redirect(303, '/my/integrations');
};
