import { relations, type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const waitlists = sqliteTable("waitlists", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  waitTime: text("wait_time"),
  waitlistCohort: text("waitlist_cohort"),
  enrolledCohort: text("enrolled_cohort"),
});

export const waitlistRelations = relations(waitlists, ({ one, many }) => ({
  students: many(waitingUsers),
}));

export type Waitlist = InferSelectModel<typeof waitlists>;

export const waitingUsers = sqliteTable(
  "waiting_users",
  {
    id: int().primaryKey({ autoIncrement: true }),
    cid: int("cid")
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    waitlistId: int("waitlist_id")
      .notNull()
      .references(() => waitlists.id, { onDelete: "cascade" }),
    position: int("position").notNull(),
    waitingSince: int("waiting_since", { mode: "timestamp" })
      .notNull()
      .default(new Date(0)),
  },
  (t) => [
    index("waiting_users_cid_idx").on(t.cid),
    index("waiting_users_waitlistId_idx").on(t.waitlistId),
    index("waiting_users_position_idx").on(t.position),
    index("waiting_users_waitingSince_idx").on(t.waitingSince),
  ]
);

export const waitingUsersRelations = relations(
  waitingUsers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [waitingUsers.cid],
      references: [users.cid],
    }),
    waitlist: one(waitlists, {
      fields: [waitingUsers.waitlistId],
      references: [waitlists.id],
    }),
  })
);

export type WaitingUser = InferSelectModel<typeof waitingUsers>;
