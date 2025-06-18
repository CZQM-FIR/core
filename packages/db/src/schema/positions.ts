import type { InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const positions = sqliteTable(
  "positions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    callsign: text().notNull().unique(),
    frequency: text().notNull(),
    name: text().notNull(),
  },
  (t) => [
    index("positions_frequency_idx").on(t.frequency),
    index("positions_name_idx").on(t.name),
  ]
);

export type Position = InferSelectModel<typeof positions>;
