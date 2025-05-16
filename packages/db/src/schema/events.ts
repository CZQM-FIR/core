import type { InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable('events', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
  start: int({ mode: 'timestamp' }).notNull(),
  end: int({ mode: 'timestamp' }).notNull(),
  image: text().notNull() // R2 key
});

export type Event = InferSelectModel<typeof events>;
