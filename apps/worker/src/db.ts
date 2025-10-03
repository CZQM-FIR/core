import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@czqm/db/schema';
import type { Env } from '.';

export const createDB = (env: Env) => {
  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_TOKEN
  });

  const db = drizzle(client, {
    schema
  });

  return {
    db,
    client
  };
};
