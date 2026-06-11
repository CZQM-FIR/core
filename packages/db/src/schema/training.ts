import { type InferSelectModel } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { customAlphabet } from "nanoid";
import { users } from "./users";
import { waitlists } from "./waitlist";

const generateCourseId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  5,
);

export const courses = sqliteTable("courses", {
  id: text()
    .primaryKey()
    .$defaultFn(() => generateCourseId()),
  name: text().notNull(),
  description: text(),
  waitlistId: int("waitlist_id")
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
  courseId: text()
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
