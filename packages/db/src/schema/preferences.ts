import { relations, type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { users } from "./index";

export const preferences = sqliteTable(
  "preferences",
  {
    id: int().primaryKey({ autoIncrement: true }),
    cid: int()
      .notNull()
      .references(() => users.cid, {
        onDelete: "cascade",
      }),
    key: text().notNull(),
    value: text().notNull(),
  },
  (t) => [
    index("preferences_cid_idx").on(t.cid),
    index("preferences_key_idx").on(t.key),
    unique("preferences_cid_key_unique").on(t.cid, t.key),
  ]
);

export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, {
    fields: [preferences.cid],
    references: [users.cid],
  }),
}));

export type Preference = InferSelectModel<typeof preferences>;
