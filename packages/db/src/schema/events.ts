import type { InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable(
  "events",
  {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    description: text().notNull(),
    start: int({ mode: "timestamp" }).notNull(),
    end: int({ mode: "timestamp" }).notNull(),
    image: text().notNull(), // R2 key
    recurring: int({ mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    index("events_name_idx").on(t.name),
    index("events_start_idx").on(t.start),
    index("events_end_idx").on(t.end),
  ]
);

export type Event = InferSelectModel<typeof events>;
