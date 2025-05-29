import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { TURSO_URL, TURSO_TOKEN } from '$env/static/private';
import * as schema from '@czqm/db/schema';

// if (!env.TURSO_URL) throw new Error('TURSO_URL is not set');
// if (!dev && !env.TURSO_TOKEN) throw new Error('TURSO_TOKEN is not set');

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
export const db = drizzle(client, {
	schema
});
