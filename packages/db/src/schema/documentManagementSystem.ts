import { type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const dmsDocuments = sqliteTable(
  "dms_documents",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    required: int({ mode: "boolean" }).notNull(),
    name: text().notNull(),
    description: text(),
    groupId: text().references(() => dmsGroups.id, { onDelete: "set null" }),
    short: text(),
  },
  (table) => [index("dms_documents_group_id_idx").on(table.groupId)],
);
export type DmsDocument = InferSelectModel<typeof dmsDocuments>;

export const dmsGroups = sqliteTable("dms_groups", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  sort: int().notNull().default(99),
});
export type DmsGroup = InferSelectModel<typeof dmsGroups>;

export const dmsAssets = sqliteTable(
  "dms_assets",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text()
      .notNull()
      .references(() => dmsDocuments.id, { onDelete: "cascade" }),
    version: text().notNull(),
    effectiveDate: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiryDate: int({ mode: "timestamp" }),
    public: int({ mode: "boolean" }).notNull().default(false),
    url: text().notNull(),
  },
  (table) => [
    index("dms_assets_document_id_idx").on(table.documentId),
    index("dms_assets_effective_date_idx").on(table.effectiveDate),
  ],
);
export type DmsAsset = InferSelectModel<typeof dmsAssets>;
