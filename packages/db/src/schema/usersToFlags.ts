import {
  index,
  int,
  primaryKey,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { flags, users } from "./index";
import { relations, type InferSelectModel } from "drizzle-orm";

export const usersToFlags = sqliteTable(
  "user_flags",
  {
    flagId: int("flag_id")
      .notNull()
      .references(() => flags.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.flagId] }),
    index("user_flags_flagId_idx").on(t.flagId),
    index("user_flags_userId_idx").on(t.userId),
  ]
);

export type UsersToFlags = InferSelectModel<typeof usersToFlags>;

export const usersToFlagsRelations = relations(usersToFlags, ({ one }) => ({
  user: one(users, {
    fields: [usersToFlags.userId],
    references: [users.cid],
  }),
  flag: one(flags, {
    fields: [usersToFlags.flagId],
    references: [flags.id],
  }),
}));
