import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  int,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const emailContent = sqliteTable("email_content", {
  id: int().primaryKey({ autoIncrement: true }),
  type: text({ enum: ["welcome_email"] }).notNull(), // e.g. "welcome_email"
  audience: text({ enum: ["controller", "visitor"] }).notNull(), // e.g. "controller", "visitor", etc.
  content: text().notNull(), // the actual email content in markdown
});

export type EmailContent = InferSelectModel<typeof emailContent>;
