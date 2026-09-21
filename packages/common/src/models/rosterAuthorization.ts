import { and, eq, inArray } from "drizzle-orm";
import {
  roster,
  soloEndorsementPositions,
  soloEndorsements,
  type Position,
  type RosterPosition,
} from "@czqm/db/schema";
import type { DB } from "../db";
import {
  assertSameLevelPositions,
  rosterLevelFromCallsign,
  SOLO_MAX_POSITIONS,
} from "./rosterLevel";

export async function certifyControllerOnRoster(
  db: DB,
  controllerId: number,
  position: RosterPosition,
): Promise<void> {
  const existing = await db.query.roster.findFirst({
    where: { controllerId, position },
  });

  if (existing) {
    await db
      .update(roster)
      .set({ status: 2 })
      .where(
        and(
          eq(roster.controllerId, controllerId),
          eq(roster.position, position),
        ),
      );
  } else {
    await db.insert(roster).values({
      controllerId,
      position,
      status: 2,
    });
  }

  const endorsements = await db.query.soloEndorsements.findMany({
    where: { controllerId },
    with: { positions: true },
  });

  const now = Date.now();
  const matchingIds = endorsements
    .filter(
      (endorsement) =>
        endorsement.expiresAt.valueOf() > now &&
        endorsement.positions.some(
          (pos) => rosterLevelFromCallsign(pos.callsign) === position,
        ),
    )
    .map((endorsement) => endorsement.id);

  if (matchingIds.length > 0) {
    await db
      .delete(soloEndorsements)
      .where(inArray(soloEndorsements.id, matchingIds));
  }
}

export async function grantSoloEndorsement(
  db: DB,
  controllerId: number,
  callsigns: string[],
  durationDays: number,
): Promise<void> {
  const normalized = [
    ...new Set(
      callsigns
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0),
    ),
  ];

  if (normalized.length < 1 || normalized.length > SOLO_MAX_POSITIONS) {
    throw new Error(
      `Solo authorization requires 1–${SOLO_MAX_POSITIONS} positions`,
    );
  }

  const positions: Position[] = [];
  for (const callsign of normalized) {
    const position = await db.query.positions.findFirst({
      where: { callsign },
    });
    if (!position) {
      throw new Error(`Position not found: ${callsign}`);
    }
    positions.push(position);
  }

  const level = assertSameLevelPositions(positions);

  const rosterRows = await db.query.roster.findMany({
    where: { controllerId },
  });
  if (rosterRows.some((row) => row.position === level && row.status === 2)) {
    throw new Error("User is already certified for this position level");
  }

  const activeEndorsements = await db.query.soloEndorsements.findMany({
    where: { controllerId },
    with: { positions: true },
  });

  const now = Date.now();
  const requestedIds = new Set(positions.map((p) => p.id));
  const overlapping = activeEndorsements.filter(
    (endorsement) =>
      endorsement.expiresAt.valueOf() > now &&
      endorsement.positions.some((pos) => requestedIds.has(pos.id)),
  );

  if (overlapping.length > 0) {
    const overlappingCallsigns = [
      ...new Set(
        overlapping.flatMap((e) =>
          e.positions
            .filter((pos) => requestedIds.has(pos.id))
            .map((pos) => pos.callsign),
        ),
      ),
    ];
    throw new Error(
      `Controller already has an active solo covering: ${overlappingCallsigns.join(", ")}`,
    );
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  const [inserted] = await db
    .insert(soloEndorsements)
    .values({
      controllerId,
      expiresAt,
    })
    .returning({ id: soloEndorsements.id });

  if (!inserted) {
    throw new Error("Failed to create solo endorsement");
  }

  await db.insert(soloEndorsementPositions).values(
    positions.map((position) => ({
      endorsementId: inserted.id,
      positionId: position.id,
    })),
  );
}
