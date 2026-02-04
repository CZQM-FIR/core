import { index, int, sqliteTable } from "drizzle-orm/sqlite-core";
import { positions, ratings, users } from "./index";
import { type InferSelectModel } from "drizzle-orm";

export const sessions = sqliteTable(
  "sessions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    userId: int()
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    positionId: int()
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
    duration: int().notNull(), // in seconds
    logonTime: int({ mode: "timestamp" }).notNull().default(new Date(0)),
    ratingId: int().references(() => ratings.id),
    aircraftTracked: int().notNull().default(0),
    aircraftSeen: int().notNull().default(0),
    flightsAmended: int().notNull().default(0),
    handoffsInitiated: int().notNull().default(0),
    handoffsReceived: int().notNull().default(0),
    handoffsRefused: int().notNull().default(0),
    squawksAssigned: int().notNull().default(0),
    cruiseAltsModified: int().notNull().default(0),
    tempAltsModified: int().notNull().default(0),
    scratchpadMods: int().notNull().default(0),
  },
  (t) => [
    index("sessions_userId_idx").on(t.userId),
    index("sessions_positionId_idx").on(t.positionId),
    index("sessions_logonTime_idx").on(t.logonTime),
  ],
);

export type Session = InferSelectModel<typeof sessions>;
