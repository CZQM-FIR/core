import type { AssistantRole } from "@czqm/db/schema";
import type { FlagName } from "./models/user";

export type AssistantRoleInfo = {
  /**
   * Public title (staff page, Overseer, toast messages).
   * Edit this map to rename assistant positions site-wide.
   */
  label: string;
  /**
   * Exact Discord role name for sync. Defaults to `label` when omitted.
   * Set this if the guild still uses a legacy role name after you change `label`.
   */
  discordRoleName?: string;
  parentFlag: FlagName;
  /** Lead title — used in Overseer ("Supports the ..."). */
  parentLabel: string;
};

/**
 * Mapping between assistant role enum values, the staff flag they assist,
 * and the human-readable label shown in admin/public UI.
 */
export const ASSISTANT_ROLE_INFO: Record<AssistantRole, AssistantRoleInfo> = {
  "asst-web": {
    label: "Web Team",
    parentFlag: "web",
    parentLabel: "Webmaster",
  },
  "asst-chief-instructor": {
    label: "Training Admin",
    parentFlag: "chief-instructor",
    parentLabel: "Chief Instructor",
  },
  "asst-events": {
    label: "Events Team",
    parentFlag: "events",
    parentLabel: "Events Coordinator",
  },
  "asst-sector": {
    label: "Engineering Team",
    parentFlag: "sector",
    parentLabel: "Facility Engineer",
  },
};

/** Convenience: ordered list of role enum values for stable UI rendering. */
export const ASSISTANT_ROLES_ORDERED: AssistantRole[] = [
  "asst-chief-instructor",
  "asst-events",
  "asst-web",
  "asst-sector",
];

/** Discord guild role name used by the sync worker (falls back to public `label`). */
export function getAssistantDiscordRoleName(role: AssistantRole): string {
  const info = ASSISTANT_ROLE_INFO[role];
  return info.discordRoleName ?? info.label;
}

/**
 * Team Discord role for someone who holds the parent staff flag (e.g. web → same role as Web Team assistants).
 */
export function getDiscordTeamRoleForStaffParentFlag(
  flag: FlagName,
): string | undefined {
  for (const role of ASSISTANT_ROLES_ORDERED) {
    if (ASSISTANT_ROLE_INFO[role].parentFlag === flag) {
      return getAssistantDiscordRoleName(role);
    }
  }
  return undefined;
}
