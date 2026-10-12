import { type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { trainingSessions } from "./training";
import { users } from "./users";

export const BOOKING_FACILITIES = ["live", "sweatbox", "sweatbox2"] as const;
export type BookingFacility = (typeof BOOKING_FACILITIES)[number];

export const BOOKING_VATSIM_TYPES = ["booking", "training"] as const;
export type BookingVatsimType = (typeof BOOKING_VATSIM_TYPES)[number];

export const BOOKING_POLICY_KINDS = ["controller", "instructor"] as const;
export type BookingPolicyKind = (typeof BOOKING_POLICY_KINDS)[number];

export const BOOKING_STATUSES = ["active", "forfeited", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = sqliteTable(
  "bookings",
  {
    id: int().primaryKey({ autoIncrement: true }),
    vatsimBookingId: int("vatsim_booking_id"),
    cid: int()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    callsign: text().notNull(),
    startsAt: int("starts_at", { mode: "timestamp" }).notNull(),
    endsAt: int("ends_at", { mode: "timestamp" }).notNull(),
    facility: text().notNull().$type<BookingFacility>(),
    vatsimType: text("vatsim_type").notNull().$type<BookingVatsimType>(),
    policyKind: text("policy_kind").notNull().$type<BookingPolicyKind>(),
    status: text().notNull().$type<BookingStatus>().default("active"),
    createdByCid: int("created_by_cid")
      .notNull()
      .references(() => users.cid),
    trainingSessionId: int("training_session_id").references(
      () => trainingSessions.id,
      { onDelete: "set null" },
    ),
    /** Set when the booked controller is first seen online on the callsign at/after start. */
    checkedInAt: int("checked_in_at", { mode: "timestamp" }),
    createdAt: int("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: int("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("bookings_time_range_idx").on(t.startsAt, t.endsAt),
    index("bookings_cid_idx").on(t.cid),
    index("bookings_callsign_idx").on(t.callsign),
    index("bookings_status_idx").on(t.status),
    index("bookings_training_session_idx").on(t.trainingSessionId),
  ],
);

export type BookingRow = InferSelectModel<typeof bookings>;
