import { and, eq } from "drizzle-orm";
import { users, usersToFlags, waitingUsers } from "@czqm/db/schema";
import type { DB } from "../db";
import type { FlagName } from "./user";

export const getFlagIdByName = async (
  db: DB,
  flagName: FlagName,
): Promise<number> => {
  const flag = await db.query.flags.findFirst({
    where: { name: flagName },
    columns: { id: true },
  });

  if (!flag) {
    throw new Error(`Flag not found: ${flagName}`);
  }

  return flag.id;
};

export const getWaitlistIdByName = async (
  db: DB,
  waitlistName: string,
): Promise<number> => {
  const waitlist = await db.query.waitlists.findFirst({
    where: { name: waitlistName },
    columns: { id: true },
  });

  if (!waitlist) {
    throw new Error(`Waitlist not found: ${waitlistName}`);
  }

  return waitlist.id;
};

export const upsertRosterUser = async (
  db: DB,
  input: {
    cid: number;
    firstName: string;
    lastName: string;
    email: string;
    ratingId: number;
  },
): Promise<void> => {
  await db
    .insert(users)
    .values({
      cid: input.cid,
      name_first: input.firstName,
      name_last: input.lastName,
      name_full: `${input.firstName} ${input.lastName}`,
      email: input.email,
      ratingID: input.ratingId,
    })
    .onConflictDoUpdate({
      target: users.cid,
      set: {
        name_first: input.firstName,
        name_last: input.lastName,
        name_full: `${input.firstName} ${input.lastName}`,
        email: input.email,
        ratingID: input.ratingId,
      },
    });
};

export const ensureUserFlag = async (
  db: DB,
  cid: number,
  flagName: FlagName,
): Promise<void> => {
  const flagId = await getFlagIdByName(db, flagName);

  await db
    .insert(usersToFlags)
    .values({ userId: cid, flagId })
    .onConflictDoNothing();
};

export const removeUserFlag = async (
  db: DB,
  cid: number,
  flagName: FlagName,
): Promise<void> => {
  const flag = await db.query.flags.findFirst({
    where: { name: flagName },
    columns: { id: true },
  });

  if (!flag) {
    return;
  }

  await db
    .delete(usersToFlags)
    .where(and(eq(usersToFlags.userId, cid), eq(usersToFlags.flagId, flag.id)));
};

export const ensureUserOnWaitlist = async (
  db: DB,
  input: {
    cid: number;
    waitlistName: string;
    waitingSince?: Date;
  },
): Promise<boolean> => {
  const waitlist = await db.query.waitlists.findFirst({
    where: { name: input.waitlistName },
    with: {
      students: {
        columns: {
          id: true,
        },
      },
    },
  });

  if (!waitlist) {
    throw new Error(`Waitlist not found: ${input.waitlistName}`);
  }

  const existing = await db.query.waitingUsers.findFirst({
    where: {
      cid: input.cid,
      waitlistId: waitlist.id,
    },
    columns: {
      id: true,
    },
  });

  if (existing) {
    return false;
  }

  await db.insert(waitingUsers).values({
    cid: input.cid,
    waitlistId: waitlist.id,
    waitingSince: input.waitingSince ?? new Date(),
    position: waitlist.students.length,
  });

  return true;
};
