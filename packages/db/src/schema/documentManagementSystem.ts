import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  int,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const dmsDocuments = sqliteTable(
  "dms_documents",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    required: int({ mode: "boolean" }).notNull(),
    name: text().notNull(),
    description: text(),
    groupId: text().references(() => dmsGroups.id, { onDelete: "cascade" }),
    short: text().notNull(),
    sort: int().notNull().default(99),
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
  slug: text().notNull().unique(),
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

export const dmsAcknowledgements = sqliteTable(
  "dms_acknowledgements",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text()
      .notNull()
      .references(() => dmsAssets.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    acknowledgedAt: int({ mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("dms_acknowledgements_user_asset_unique_idx").on(
      table.userId,
      table.assetId,
    ),
    index("dms_acknowledgements_asset_id_idx").on(table.assetId),
    index("dms_acknowledgements_user_id_idx").on(table.userId),
  ],
);
