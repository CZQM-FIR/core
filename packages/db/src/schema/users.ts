import { relations, type InferSelectModel } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { news, ratings, sessions, tickets, usersToFlags } from "./index";
import { soloEndorsements } from "./soloEndorsements";
import { roster } from "./roster";

export const users = sqliteTable("users", {
  cid: int().primaryKey(),
  name_first: text().notNull(),
  name_last: text().notNull(),
  name_full: text().notNull(),
  email: text().notNull().unique(),
  ratingID: int()
    .notNull()
    .references(() => ratings.id),
  division: text(),
  region: text(),
  subdivision: text(),
  bio: text(),
  discord_id: int(),
  active: int().notNull().default(1), // 1 active, 0 inactive, -1 LoA
});

export const usersRelations = relations(users, ({ one, many }) => ({
  rating: one(ratings, {
    fields: [users.ratingID],
    references: [ratings.id],
  }),
  flags: many(usersToFlags),
  // articles: many(news),
  sessions: many(sessions),
  tickets: many(tickets),
  soloEndorsements: many(soloEndorsements),
  roster: many(roster),
}));

export type User = InferSelectModel<typeof users>;
