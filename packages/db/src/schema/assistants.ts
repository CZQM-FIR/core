import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  int,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const ASSISTANT_ROLES = [
  "asst-web",
  "asst-chief-instructor",
  "asst-events",
  "asst-sector",
] as const;

export type AssistantRole = (typeof ASSISTANT_ROLES)[number];

export const assistants = sqliteTable(
  "assistants",
  {
    id: int().primaryKey({ autoIncrement: true }),
    cid: int()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    role: text({ enum: ASSISTANT_ROLES }).notNull(),
    assignedAt: int("assigned_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("assistants_cid_role_idx").on(t.cid, t.role),
    index("assistants_role_idx").on(t.role),
  ],
);

export type Assistant = InferSelectModel<typeof assistants>;
