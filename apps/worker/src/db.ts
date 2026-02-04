import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import type { Env } from '.';
import { relations } from '@czqm/db/relations';

export const createDB = (env: Env) => {
  const client = createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_TOKEN
  });

  const db = drizzle({ client, relations });

  return { db, client };
};
