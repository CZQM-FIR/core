import { relations, type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { usersToFlags } from "./usersToFlags";

export const flags = sqliteTable(
  "flags",
  {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    showInSelect: int({ mode: "boolean" }).default(true),
  },
  (t) => [index("flags_name_idx").on(t.name)]
);

export const flagsRelations = relations(flags, ({ many }) => ({
  usersToFlags: many(usersToFlags),
}));

export type Flag = InferSelectModel<typeof flags>;
