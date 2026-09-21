import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  int,
  primaryKey,
  sqliteTable,
} from "drizzle-orm/sqlite-core";
import { positions } from "./positions";
import { users } from "./users";

export const soloEndorsements = sqliteTable(
  "solo_endorsements",
  {
    id: int().primaryKey({ autoIncrement: true }),
    controllerId: int("controller_id")
      .notNull()
      .references(() => users.cid, { onDelete: "cascade" }),
    expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("controller_id_idx").on(t.controllerId)],
);

export const soloEndorsementPositions = sqliteTable(
  "solo_endorsement_positions",
  {
    endorsementId: int("endorsement_id")
      .notNull()
      .references(() => soloEndorsements.id, { onDelete: "cascade" }),
    positionId: int("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.endorsementId, t.positionId] }),
    index("solo_endorsement_positions_endorsement_idx").on(t.endorsementId),
    index("solo_endorsement_positions_position_idx").on(t.positionId),
  ],
);

export type SoloEndorsement = InferSelectModel<typeof soloEndorsements>;
export type SoloEndorsementPosition = InferSelectModel<
  typeof soloEndorsementPositions
>;
