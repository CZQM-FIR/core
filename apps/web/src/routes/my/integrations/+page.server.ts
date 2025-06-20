import { db } from '$lib/db';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { and, eq } from 'drizzle-orm';
import * as schema from '@czqm/db/schema';
import { env } from '$env/dynamic/private';

const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = env;

export const load = (async ({ locals }) => {
  const integrations = await db.query.integrations.findMany({
    where: (integrations, { eq }) => eq(integrations.cid, locals.user.cid)
  });

  return { integrations };
}) satisfies PageServerLoad;

export const actions = {
  linkDiscord: async ({ locals }) => {
    const discordIntegration = await db.query.integrations.findFirst({
      where: (integrations, { and, eq }) =>
        and(eq(schema.integrations.cid, locals.user.cid), eq(schema.integrations.type, 0))
    });

    if (discordIntegration) {
      return fail(400, {
        message: 'Discord integration already exists.'
      });
    }

    return redirect(
      303,
      `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${DISCORD_REDIRECT_URI}&scope=identify+guilds.join`
    );
  },
  unlinkDiscord: async ({ locals }) => {
    const discordIntegration = await db.query.integrations.findFirst({
      where: (integrations, { and, eq }) =>
        and(eq(schema.integrations.cid, locals.user.cid), eq(schema.integrations.type, 0))
    });

    if (!discordIntegration) {
      return fail(400, {
        message: 'Discord integration does not exist.'
      });
    }

    await db
      .delete(schema.integrations)
      .where(and(eq(schema.integrations.cid, locals.user.cid), eq(schema.integrations.type, 0)));

    return { message: 'Discord integration unlinked successfully.' };
  }
};
