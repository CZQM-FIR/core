import { index, int, sqliteTable } from "drizzle-orm/sqlite-core";
import { positions, users } from "./index";
import { relations, type InferSelectModel } from "drizzle-orm";

export const sessions = sqliteTable(
  "sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    positionId: int()
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    duration: int().notNull(),
    logonTime: int({ mode: "timestamp" }).notNull().default(new Date(0)),
  },
  (t) => [
    index("sessions_userId_idx").on(t.userId),
    index("sessions_positionId_idx").on(t.positionId),
    index("sessions_logonTime_idx").on(t.logonTime),
  ]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  controller: one(users, {
    fields: [sessions.userId],
    references: [users.cid],
  }),
  position: one(positions, {
    fields: [sessions.positionId],
    references: [positions.id],
  }),
}));

export type Session = InferSelectModel<typeof sessions>;
