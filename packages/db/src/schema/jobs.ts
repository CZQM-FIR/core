import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobs = sqliteTable("jobs", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text().notNull(),
  scheduledTime: int({ mode: "timestamp" }).notNull(),
  executedTime: int({ mode: "timestamp" }).notNull(),
});

export type Job = typeof jobs.$inferSelect;
