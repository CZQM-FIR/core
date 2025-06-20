import { int, sqliteTable, text, unique, index } from "drizzle-orm/sqlite-core";
import { users } from "./index";
import { relations, type InferSelectModel } from "drizzle-orm";

export const integrations = sqliteTable(
  "integrations",
  {
    id: int().primaryKey({ autoIncrement: true }),
    type: int().notNull(), // 0 = Discord
    integrationUserId: text("integration_user_id").notNull(),
    cid: int()
      .notNull()
      .references(() => users.cid, {
        onDelete: "cascade",
      }),
    integrationUserName: text("integration_user_name"),
  },
  (t) => [
    unique().on(t.cid, t.type),
    index("integrations_cid_idx").on(t.cid),
    index("integrations_type_idx").on(t.type),
    index("integrations_integrationUserId_idx").on(t.integrationUserId),
  ]
);

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.cid],
    references: [users.cid],
  }),
}));

export type Integration = InferSelectModel<typeof integrations>;
