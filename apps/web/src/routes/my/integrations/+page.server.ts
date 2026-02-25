import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/auth';
import { db } from '$lib/db';
import * as schema from '@czqm/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load = (async () => {
  return {};
}) satisfies PageServerLoad;

export const actions: Actions = {
  linkDiscord: async (event) => {
    const { user } = await auth(event);
    if (!user) {
      throw redirect(303, '/auth?redirect=/my/integrations');
    }
    const existing = await db.query.integrations.findFirst({
      where: { cid: user.cid, type: 0 }
    });
    if (existing) {
      throw error(400, { message: 'Discord integration already exists.' });
    }
    const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = env;
    throw redirect(
      303,
      `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${DISCORD_REDIRECT_URI}&scope=identify+guilds.join`
    );
  },
  unlinkDiscord: async (event) => {
    const { user } = await auth(event);
    if (!user) {
      throw redirect(303, '/auth?redirect=/my/integrations');
    }
    const discordIntegration = await db.query.integrations.findFirst({
      where: { cid: user.cid, type: 0 }
    });
    if (!discordIntegration) {
      throw error(400, { message: 'Discord integration does not exist.' });
    }
    await db
      .delete(schema.integrations)
      .where(and(eq(schema.integrations.cid, user.cid), eq(schema.integrations.type, 0)));
    return { message: 'Discord integration unlinked successfully.' };
  }
};
