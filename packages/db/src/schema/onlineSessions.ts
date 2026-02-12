import { index, int, sqliteTable } from "drizzle-orm/sqlite-core";
import type { InferSelectModel } from "drizzle-orm";

export const onlineSessions = sqliteTable("online_sessions", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: int().notNull(),
  positionId: int().notNull(),
  start: int({ mode: "timestamp" }).default(new Date(0)),
});

export type OnlineSession = InferSelectModel<typeof onlineSessions>;
