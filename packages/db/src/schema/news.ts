import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { users } from './index.js';
import { relations, type InferSelectModel } from 'drizzle-orm';

export const news = sqliteTable('news', {
  id: int().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  text: text().notNull(),
  date: int({ mode: 'timestamp' }).notNull(),
  authorID: int('author_id').references(() => users.cid, { onDelete: 'set null' }),
  image: text()
});

export const newsRelations = relations(news, ({ one }) => ({
  author: one(users, {
    fields: [news.authorID],
    references: [users.cid]
  })
}));

export type Article = InferSelectModel<typeof news>;
