import { dev } from '$app/environment';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '$env/dynamic/private';
import { relations } from '@czqm/db/relations';

if (!env.TURSO_URL) throw new Error('TURSO_URL is not set');
if (!dev && !env.TURSO_TOKEN) throw new Error('TURSO_TOKEN is not set');

export const db = drizzle({
  relations,
  connection: {
    url: env.TURSO_URL,
    authToken: env.TURSO_TOKEN
  }
});
