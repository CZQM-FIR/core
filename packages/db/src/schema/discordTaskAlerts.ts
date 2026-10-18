import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

/** Discord messages posted when a student reaches a manually completed course task. */
export const discordTaskAlerts = sqliteTable(
  "discord_task_alerts",
  {
    id: int().primaryKey({ autoIncrement: true }),
    courseId: text("course_id").notNull(),
    taskId: int("task_id").notNull(),
    cid: int().notNull(),
    channelId: text("channel_id").notNull(),
    messageId: text("message_id"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [unique().on(t.courseId, t.taskId, t.cid)],
);

export type DiscordTaskAlertRow = typeof discordTaskAlerts.$inferSelect;
