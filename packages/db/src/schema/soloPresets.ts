import { type InferSelectModel } from "drizzle-orm";
import {
  index,
  int,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { positions } from "./positions";

export const SOLO_PRESET_LEVELS = ["gnd", "twr", "app", "ctr"] as const;

export type SoloPresetLevel = (typeof SOLO_PRESET_LEVELS)[number];

export const soloPresets = sqliteTable(
  "solo_presets",
  {
    id: int().primaryKey({ autoIncrement: true }),
    level: text("level", { enum: SOLO_PRESET_LEVELS }).notNull(),
    name: text("name"),
  },
  (t) => [uniqueIndex("solo_presets_level_idx").on(t.level)],
);

export const soloPresetPositions = sqliteTable(
  "solo_preset_positions",
  {
    presetId: int("preset_id")
      .notNull()
      .references(() => soloPresets.id, { onDelete: "cascade" }),
    positionId: int("position_id")
      .notNull()
      .references(() => positions.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.presetId, t.positionId] }),
    index("solo_preset_positions_preset_idx").on(t.presetId),
    index("solo_preset_positions_position_idx").on(t.positionId),
  ],
);

export type SoloPreset = InferSelectModel<typeof soloPresets>;
export type SoloPresetPosition = InferSelectModel<typeof soloPresetPositions>;
