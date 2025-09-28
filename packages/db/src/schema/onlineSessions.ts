import { index, int, sqliteTable } from "drizzle-orm/sqlite-core";
import { positions, users } from "./index";
import { relations, type InferSelectModel } from "drizzle-orm";

export const onlineSessions = sqliteTable(
  "online_sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int().notNull(),
    positionId: int()
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    start: int({ mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("online_sessions_userId_idx").on(t.userId),
    index("online_sessions_positionId_idx").on(t.positionId),
    index("online_sessions_start_idx").on(t.start),
  ]
);

export const onlineSessionRelations = relations(onlineSessions, ({ one }) => ({
  controller: one(users, {
    fields: [onlineSessions.userId],
    references: [users.cid],
    relationName: "controller",
  }),
  position: one(positions, {
    fields: [onlineSessions.positionId],
    references: [positions.id],
  }),
}));

export type OnlineSession = InferSelectModel<typeof onlineSessions>;
