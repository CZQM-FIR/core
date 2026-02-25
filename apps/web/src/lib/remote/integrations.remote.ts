import { form, getRequestEvent, query } from '$app/server';
import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const getMyIntegrations = query(async () => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my/integrations');
  }
  const integrations = await db.query.integrations.findMany({
    where: { cid }
  });
  return { integrations };
});

export const linkDiscord = form('unchecked', async () => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my/integrations');
  }
  const discordIntegration = await db.query.integrations.findFirst({
    where: { cid, type: 0 }
  });
  if (discordIntegration) {
    throw error(400, { message: 'Discord integration already exists.' });
  }
  const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = env;
  throw redirect(
    303,
    `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${DISCORD_REDIRECT_URI}&scope=identify+guilds.join`
  );
});

export const unlinkDiscord = form('unchecked', async () => {
  const event = getRequestEvent();
  const cid = event.locals.user?.cid;
  if (cid == null) {
    throw redirect(303, '/auth?redirect=/my/integrations');
  }
  const discordIntegration = await db.query.integrations.findFirst({
    where: { cid, type: 0 }
  });
  if (!discordIntegration) {
    throw error(400, { message: 'Discord integration does not exist.' });
  }
  await db
    .delete(schema.integrations)
    .where(and(eq(schema.integrations.cid, cid), eq(schema.integrations.type, 0)));
  return { message: 'Discord integration unlinked successfully.' };
});
