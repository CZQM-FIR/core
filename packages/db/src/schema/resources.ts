import type { InferSelectModel } from "drizzle-orm";
import { index, sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const resources = sqliteTable(
  "resources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    category: text("category").notNull(),
    public: integer("public", { mode: "boolean" }).notNull().default(true),
    type: text("type").notNull(), // 'controller', 'pilot', 'both'
  },
  (t) => [
    index("resources_name_idx").on(t.name),
    index("resources_category_idx").on(t.category),
    index("resources_public_idx").on(t.public),
    index("resources_type_idx").on(t.type),
  ]
);

export type Resource = InferSelectModel<typeof resources>;
