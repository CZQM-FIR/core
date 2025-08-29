import { relations, type InferSelectModel } from "drizzle-orm";
import { sessions } from "./sessions";
import { bookings } from "./bookings";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const positions = sqliteTable(
  "positions",
  {
    id: int().primaryKey({ autoIncrement: true }),
    callsign: text().notNull().unique(),
    frequency: text().notNull(),
    name: text().notNull(),
  },
  (t) => [
    index("positions_frequency_idx").on(t.frequency),
    index("positions_name_idx").on(t.name),
  ]
);

export const positionsRelations = relations(positions, ({ many }) => ({
  sessions: many(sessions),
  bookings: many(bookings),
}));

export type Position = InferSelectModel<typeof positions>;
