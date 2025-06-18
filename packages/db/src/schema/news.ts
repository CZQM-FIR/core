import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./index";
import { relations, type InferSelectModel } from "drizzle-orm";

export const news = sqliteTable(
  "news",
  {
    id: int().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    text: text().notNull(),
    date: int({ mode: "timestamp" }).notNull(),
    authorID: int("author_id").references(() => users.cid, {
      onDelete: "set null",
    }),
    image: text(),
  },
  (t) => [
    index("news_authorID_idx").on(t.authorID),
    index("news_date_idx").on(t.date),
    index("news_title_idx").on(t.title),
  ]
);

export const newsRelations = relations(news, ({ one }) => ({
  author: one(users, {
    fields: [news.authorID],
    references: [users.cid],
  }),
}));

export type Article = InferSelectModel<typeof news>;
