import { relations, type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable(
  "dms_documents",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    required: int({ mode: "boolean" }).notNull(),
    name: text().notNull(),
    description: text(),
    groupId: text().references(() => groups.id, { onDelete: "set null" }),
    short: text(),
  },
  (table) => ({
    groupIdIdx: index("dms_documents_group_id_idx").on(table.groupId),
  }),
);
export const documentsRelations = relations(documents, ({ one, many }) => ({
  group: one(groups, {
    fields: [documents.groupId],
    references: [groups.id],
  }),
  assets: many(assets),
}));
export type Document = InferSelectModel<typeof documents>;

export const groups = sqliteTable("dms_groups", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  sort: int().notNull().default(99),
});
export const groupsRelations = relations(groups, ({ many }) => ({
  documents: many(documents),
}));
export type Group = InferSelectModel<typeof groups>;

export const assets = sqliteTable(
  "dms_assets",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    documentId: text()
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: text().notNull(),
    effectiveDate: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    expiryDate: int({ mode: "timestamp" }),
    public: int({ mode: "boolean" }).notNull().default(false),
    url: text().notNull(),
  },
  (table) => ({
    documentIdIdx: index("dms_assets_document_id_idx").on(table.documentId),
    effectiveDateIdx: index("dms_assets_effective_date_idx").on(
      table.effectiveDate,
    ),
  }),
);
export const assetsRelations = relations(assets, ({ one }) => ({
  document: one(documents, {
    fields: [assets.documentId],
    references: [documents.id],
  }),
}));
export type Asset = InferSelectModel<typeof assets>;
