import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@czqm/db/dist';

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
