import { type InferSelectModel } from "drizzle-orm";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  moodleQueue,
  news,
  ratings,
  sessions,
  tickets,
  usersToFlags,
} from "./index";
import { soloEndorsements } from "./soloEndorsements";
import { roster } from "./roster";
import { integrations } from "./integrations";
import { preferences } from "./preferences";
import { waitingUsers } from "./waitlist";

export const users = sqliteTable(
  "users",
  {
    cid: int().primaryKey(),
    name_first: text().notNull(),
    name_last: text().notNull(),
    name_full: text().notNull(),
    email: text().notNull().unique(),
    ratingID: int()
      .notNull()
      .references(() => ratings.id),
    division: text(),
    region: text(),
    subdivision: text(),
    bio: text(),
    discord_id: int(),
    active: int().notNull().default(1), // 1 active, 0 inactive, -1 LoA
    hoursLastUpdated: int({ mode: "timestamp" }).notNull().default(new Date(0)),
  },
  (t) => [
    index("users_ratingID_idx").on(t.ratingID),
    index("users_discord_id_idx").on(t.discord_id),
    index("users_active_idx").on(t.active),
  ],
);

export type User = InferSelectModel<typeof users>;
