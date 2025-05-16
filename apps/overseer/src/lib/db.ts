import { dev } from '$app/environment';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from '@czqm/db/schema';

if (!env.TURSO_URL) throw new Error('TURSO_URL is not set');
if (!dev && !env.TURSO_TOKEN) throw new Error('TURSO_TOKEN is not set');

const client = createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
export const db = drizzle(client, {
	schema
});
