import { type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
        objectives?: string[];
      }[]
    >()
    .default([]),
  prerequisites: text("prerequisites", { mode: "json" })
    .notNull()
    .$type<
      {
        prerequisiteId: number;
        prerequisiteType: string;
        prerequisiteValue1: string | null;
        prerequisiteValue2: string | null;
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

export type TrainingSessionObjectiveResult = {
  text: string;
  achieved: boolean;
};

export const trainingSessionAvailability = sqliteTable(
  "training_session_availability",
  {
    id: int().primaryKey({ autoIncrement: true }),
    cid: int()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    courseId: text()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    taskId: int().notNull(),
    startsAt: int({ mode: "timestamp" }).notNull(),
    endsAt: int({ mode: "timestamp" }).notNull(),
    updatedAt: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("training_session_availability_lookup_idx").on(
      t.cid,
      t.courseId,
      t.taskId,
    ),
  ],
);

export const trainingSessions = sqliteTable(
  "training_sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    studentCid: int("student_cid")
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    taskId: int("task_id").notNull(),
    scheduledByCid: int("scheduled_by_cid")
      .notNull()
      .references(() => users.cid),
    startsAt: int("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: int("ends_at", { mode: "timestamp" }).notNull(),
    status: text().notNull(),
    trainingNote: text("training_note"),
    actualStartedAt: int("actual_started_at", { mode: "timestamp" }),
    actualEndedAt: int("actual_ended_at", { mode: "timestamp" }),
    instructorNotes: text("instructor_notes"),
    positionTrained: text("position_trained"),
    objectiveResults: text("objective_results", { mode: "json" }).$type<
      TrainingSessionObjectiveResult[]
    >(),
    notesSubmittedAt: int("notes_submitted_at", { mode: "timestamp" }),
    vatcanNoteId: int("vatcan_note_id"),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("training_sessions_lookup_idx").on(
      t.studentCid,
      t.courseId,
      t.taskId,
    ),
    index("training_sessions_status_idx").on(t.status),
  ],
);

export type TrainingSessionRow = InferSelectModel<typeof trainingSessions>;
