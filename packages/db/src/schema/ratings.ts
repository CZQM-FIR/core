import type { InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ratings = sqliteTable(
  "ratings",
  {
    id: int().primaryKey(),
    long: text().notNull(),
    short: text().notNull(),
  },
  (t) => [
    index("ratings_long_idx").on(t.long),
    index("ratings_short_idx").on(t.short),
  ]
);

export type Rating = InferSelectModel<typeof ratings>;
