import { relations, type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./index";

export const notifications = sqliteTable(
  "notifications",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    timestamp: int({ mode: "timestamp" }).notNull(),
    userId: int()
      .notNull()
      .references(() => users.cid),
    type: text().notNull(),
    message: text().notNull(),
    sent: int({ mode: "timestamp" }),
    buttons: text({ mode: "json" }).$type<
      {
        type: 2;
        style: number;
        label?: string;
        custom_id?: string;
        url?: string;
        disabled?: boolean;
      }[]
    >(),
    location: text().notNull().default("email").$type<"discord" | "email">(),
  },
  (table) => {
    return {
      userIdIdx: index("notifications_user_id_idx").on(table.userId),
      timestampIdx: index("notifications_timestamp_idx").on(table.timestamp),
      userTimestampIdx: index("notifications_user_timestamp_idx").on(
        table.userId,
        table.timestamp
      ),
    };
  }
);

export const notificationsRelations = relations(
  notifications,
  ({ many, one }) => ({
    user: one(users, {
      fields: [notifications.userId],
      references: [users.cid],
    }),
  })
);

export type Notification = InferSelectModel<typeof notifications>;
