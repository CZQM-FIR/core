import type { Position, RosterPosition } from "@czqm/db/schema";

const ROSTER_LEVELS = new Set<RosterPosition>(["gnd", "twr", "app", "ctr"]);

export const SOLO_MAX_POSITIONS = 5;

/**
 * Infer roster level from a position callsign suffix (after `_`).
 * Maps `del` / `tmu` → `gnd`, matching worker online ATC logic.
 */
export function rosterLevelFromCallsign(
  callsign: string,
): RosterPosition | null {
  const unitType =
    callsign.trim().toUpperCase().split("_").pop()?.toLowerCase() || "";
  const mapped = unitType === "del" || unitType === "tmu" ? "gnd" : unitType;
  if (ROSTER_LEVELS.has(mapped as RosterPosition)) {
    return mapped as RosterPosition;
  }
  return null;
}

export function assertSameLevelPositions(
  positions: Pick<Position, "callsign">[],
): RosterPosition {
  if (positions.length === 0) {
    throw new Error("At least one position is required");
  }

  const levels = positions.map((position) => {
    const level = rosterLevelFromCallsign(position.callsign);
    if (!level) {
      throw new Error(
        `Cannot determine roster level for callsign: ${position.callsign}`,
      );
    }
    return level;
  });

  const first = levels[0]!;
  if (levels.some((level) => level !== first)) {
    throw new Error(
      "All positions on a solo authorization must be the same roster level",
    );
  }

  return first;
}
