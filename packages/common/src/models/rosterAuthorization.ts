import { and, eq, inArray } from "drizzle-orm";
import { roster, soloEndorsements, type RosterPosition } from "@czqm/db/schema";
import type { DB } from "../db";

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
    with: { position: true },
  });

  const now = Date.now();
  const matchingIds = endorsements
    .filter(
      (endorsement) =>
        endorsement.expiresAt.valueOf() > now &&
        endorsement.position.callsign.toLowerCase().includes(position),
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
  callsign: string,
  durationDays: number,
): Promise<void> {
  const positionName = callsign.trim().toUpperCase();
  if (!positionName) {
    throw new Error("Solo position is required");
  }

  const position = await db.query.positions.findFirst({
    where: { callsign: positionName },
  });
  if (!position) {
    throw new Error(`Position not found: ${positionName}`);
  }

  const rosterRows = await db.query.roster.findMany({
    where: { controllerId },
  });
  if (
    rosterRows.some(
      (row) =>
        positionName.toLowerCase().includes(row.position) && row.status === 2,
    )
  ) {
    throw new Error("User is already certified for this position");
  }

  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  await db
    .insert(soloEndorsements)
    .values({
      controllerId,
      positionId: position.id,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [soloEndorsements.controllerId, soloEndorsements.positionId],
      set: { expiresAt },
    });
}
