import { relations, type InferSelectModel } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const moodleQueue = sqliteTable("moodle_queue", {
  id: int().primaryKey({ autoIncrement: true }),
  cid: int("cid")
    .references(() => users.cid, { onDelete: "cascade" })
    .notNull(),
  cohortId: text("cohort_id").notNull(),
  timestamp: int("timestamp", { mode: "timestamp" })
    .notNull()
    .default(new Date(0)),
  add: int("add", { mode: "boolean" }).notNull().default(true),
});

export const moodleQueueRelations = relations(moodleQueue, ({ one, many }) => ({
  user: one(users, {
    fields: [moodleQueue.cid],
    references: [users.cid],
  }),
}));

export type MoodleQueue = InferSelectModel<typeof moodleQueue>;
