import type { InferSelectModel } from 'drizzle-orm';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const resources = sqliteTable('resources', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  url: text('url').notNull(),
  category: text('category').notNull(),
  public: integer('public').notNull().default(1),
  type: text('type').notNull() // 'controller', 'pilot', 'both'
});

export type Resource = InferSelectModel<typeof resources>;
