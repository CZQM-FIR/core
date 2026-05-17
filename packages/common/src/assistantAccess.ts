import type { AssistantRole } from "@czqm/db/schema";
import { ASSISTANT_ROLE_INFO } from "./assistants";
import type { DB } from "./db";
import type { User } from "./models/user";
import type { FlagName } from "./models/user";

/**
 * OR gate for Overseer leadership tools and user listing: real `staff` role flags plus
 * every flag that can be an assistant parent (`ASSISTANT_ROLE_INFO.parentFlag`), plus
 * `admin` / `chief` / `deputy`. Used with `User.resolveAuthorizedUser` (default assistant parity).
 */
export const OVERSEER_PARENT_PARITY_GATE_FLAGS: FlagName[] = [
  "admin",
  "chief",
  "deputy",
  "chief-instructor",
  "web",
  "events",
  "sector",
];

/**
 * Parent staff flags implied by rows in `assistants` for this user (`cid`).
 * Does not grant Discord/staff table flags; use only for auth parity checks.
 */
export async function getAssistantParentFlagsForUser(
  db: DB,
  cid: number,
): Promise<FlagName[]> {
  const rows = await db.query.assistants.findMany({
    where: { cid },
    columns: { role: true },
  });
  const set = new Set<FlagName>();
  for (const row of rows) {
    const info = ASSISTANT_ROLE_INFO[row.role as AssistantRole];
    if (info) set.add(info.parentFlag);
  }
  return [...set];
}

/**
 * True if the user holds any of `flags` on their account, or has an assistant assignment
 * whose parentFlag is in `flags`.
 */
export async function userHasEffectiveFlag(
  db: DB,
  user: User,
  flags: FlagName | FlagName[],
): Promise<boolean> {
  if (user.hasFlag(flags)) return true;
  const list = Array.isArray(flags) ? flags : [flags];
  const assistantParents = await getAssistantParentFlagsForUser(db, user.cid);
  return assistantParents.some((p) => list.includes(p));
}

export async function userHasAnyAssistantAssignment(
  db: DB,
  cid: number,
): Promise<boolean> {
  const row = await db.query.assistants.findFirst({
    where: { cid },
    columns: { id: true },
  });
  return row != null;
}

/** Enter `/a/*` in Overseer: staff/admin, or any assistant assignment */
export async function userCanAccessOverseerArea(
  db: DB,
  user: User | null,
): Promise<boolean> {
  if (!user) return false;
  if (user.hasFlag(["staff", "admin"])) return true;
  return userHasAnyAssistantAssignment(db, user.cid);
}

/**
 * Tools that were staff-gated (`admin` | `staff`): assistants may use them if they have any assignment.
 */
export async function userCanUseStaffScopedOverseerTools(
  db: DB,
  user: User,
): Promise<boolean> {
  if (user.hasFlag(["admin", "staff"])) return true;
  return userHasAnyAssistantAssignment(db, user.cid);
}

/** Vector `/a/waitlist`: chief / deputy / FIR staff admin, or assistant to chief instructor */
export function userHasVectorWaitlistAdminAccess(
  user: User,
  assistantParentFlags: FlagName[],
): boolean {
  if (user.hasFlag(["admin", "chief-instructor", "chief", "deputy"]))
    return true;
  return assistantParentFlags.includes("chief-instructor");
}
