import type { InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const positions = sqliteTable('positions', {
  id: int().primaryKey({ autoIncrement: true }),
  callsign: text().notNull().unique(),
  frequency: text().notNull(),
  name: text().notNull()
});

export type Position = InferSelectModel<typeof positions>;
