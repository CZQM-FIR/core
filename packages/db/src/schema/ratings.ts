import type { InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const ratings = sqliteTable('ratings', {
  id: int().primaryKey(),
  long: text().notNull(),
  short: text().notNull()
});

export type Rating = InferSelectModel<typeof ratings>;
