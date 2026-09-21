import { eq } from "drizzle-orm";
import {
  SOLO_PRESET_LEVELS,
  soloPresetPositions,
  soloPresets,
  type Position,
  type SoloPreset,
  type SoloPresetLevel,
} from "@czqm/db/schema";
import type { DB } from "../db";
import { assertSameLevelPositions, rosterLevelFromCallsign, SOLO_MAX_POSITIONS } from "./rosterLevel";

export type SoloPresetWithPositions = SoloPreset & {
  positions: Position[];
};

export async function ensureSoloPresets(
  db: DB,
): Promise<SoloPresetWithPositions[]> {
  const existing = await db.query.soloPresets.findMany({
    with: { positions: true },
  });
  const byLevel = new Map(existing.map((preset) => [preset.level, preset]));

  for (const level of SOLO_PRESET_LEVELS) {
    if (!byLevel.has(level)) {
      const [created] = await db
        .insert(soloPresets)
        .values({ level, name: null })
        .returning();
      if (created) {
        byLevel.set(level, { ...created, positions: [] });
      }
    }
  }

  return SOLO_PRESET_LEVELS.map((level) => {
    const preset = byLevel.get(level);
    if (!preset) {
      throw new Error(`Failed to ensure solo preset for level: ${level}`);
    }
    return {
      id: preset.id,
      level: preset.level,
      name: preset.name,
      positions: preset.positions ?? [],
    };
  });
}

export async function getSoloPresetByLevel(
  db: DB,
  level: SoloPresetLevel,
): Promise<SoloPresetWithPositions | null> {
  const preset = await db.query.soloPresets.findFirst({
    where: { level },
    with: { positions: true },
  });
  if (!preset) return null;
  return {
    id: preset.id,
    level: preset.level,
    name: preset.name,
    positions: preset.positions,
  };
}

export async function setSoloPresetPositions(
  db: DB,
  level: SoloPresetLevel,
  positionIds: number[],
): Promise<SoloPresetWithPositions> {
  const uniqueIds = [...new Set(positionIds)];
  if (uniqueIds.length > SOLO_MAX_POSITIONS) {
    throw new Error(
      `Solo presets may include at most ${SOLO_MAX_POSITIONS} positions`,
    );
  }

  const presets = await ensureSoloPresets(db);
  const preset = presets.find((entry) => entry.level === level);
  if (!preset) {
    throw new Error(`Solo preset not found for level: ${level}`);
  }

  const positions: Position[] = [];
  for (const positionId of uniqueIds) {
    const position = await db.query.positions.findFirst({
      where: { id: positionId },
    });
    if (!position) {
      throw new Error(`Position not found: ${positionId}`);
    }
    const positionLevel = rosterLevelFromCallsign(position.callsign);
    if (positionLevel !== level) {
      throw new Error(
        `Position ${position.callsign} is ${positionLevel ?? "unknown"}, not ${level}`,
      );
    }
    positions.push(position);
  }

  if (positions.length > 0) {
    assertSameLevelPositions(positions);
  }

  await db
    .delete(soloPresetPositions)
    .where(eq(soloPresetPositions.presetId, preset.id));

  if (positions.length > 0) {
    await db.insert(soloPresetPositions).values(
      positions.map((position) => ({
        presetId: preset.id,
        positionId: position.id,
      })),
    );
  }

  return {
    id: preset.id,
    level: preset.level,
    name: preset.name,
    positions,
  };
}
