import { relations, type InferSelectModel } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { positions } from "./positions";

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey(),
    bookingOwnerId: integer("booking_owner_id")
      .notNull()
      .references(() => users.cid),
    controllerId: integer("controller_id")
      .notNull()
      .references(() => users.cid),
    positionId: integer("position_id")
      .notNull()
      .references(() => positions.id),
    startAt: integer("start_at").notNull(),
    duration: integer("duration").notNull(),
    type: text("type", { enum: ["controller", "training"] }).notNull(),
  },
  (t) => [
    index("bookings_owner_idx").on(t.bookingOwnerId),
    index("bookings_controller_idx").on(t.controllerId),
    index("bookings_position_idx").on(t.positionId),
    index("bookings_type_idx").on(t.type),
  ]
);

export const bookingsRelations = relations(bookings, ({ one }) => ({
  bookingOwner: one(users, {
    fields: [bookings.bookingOwnerId],
    references: [users.cid],
    relationName: "bookingsAsOwner",
  }),
  controller: one(users, {
    fields: [bookings.controllerId],
    references: [users.cid],
    relationName: "bookingsAsController",
  }),
  position: one(positions, {
    fields: [bookings.positionId],
    references: [positions.id],
  }),
}));

export type Booking = InferSelectModel<typeof bookings>;
