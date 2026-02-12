import { drizzle } from "drizzle-orm/libsql";
import type { Env } from "./types";
import { relations } from "@czqm/db/relations";

export const createDB = (env: Env) => {
  const db = drizzle({
    relations,
    connection: {
      url: env.TURSO_URL,
      authToken: env.TURSO_TOKEN,
    },
  });

  return db;
};

export type DB = ReturnType<typeof createDB>;
