import { type InferSelectModel } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export type AppSetting = InferSelectModel<typeof appSettings>;
