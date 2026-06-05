import { type InferSelectModel } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { waitlists, users } from ".";

export const courses = sqliteTable("courses", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text(),
  waitlist: int()
    .notNull()
    .references(() => waitlists.id, { onDelete: "cascade" }),
  tasks: text("tasks", { mode: "json" })
    .notNull()
    .$type<
      {
        taskId: number;
        taskType: string;
        taskValue1: string | null;
        taskValue2: string | null;
      }[]
    >()
    .default([]),
});

export const courseTaskCompletions = sqliteTable("course_task_completions", {
  id: int().primaryKey({ autoIncrement: true }),
  courseId: int()
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  taskId: int().notNull(),
  userId: int()
    .notNull()
    .references(() => users.cid, { onDelete: "cascade" }),
  startedAt: int({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: int({ mode: "timestamp" }),
});

export type CourseTaskCompletionRow = InferSelectModel<
  typeof courseTaskCompletions
>;
