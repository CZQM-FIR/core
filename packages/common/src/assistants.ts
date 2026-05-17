import type { AssistantRole } from "@czqm/db/schema";
import type { FlagName } from "./models/user";

/**
 * Mapping between assistant role enum values, the staff flag they assist,
 * and the human-readable label shown in admin/public UI.
 */
export const ASSISTANT_ROLE_INFO: Record<
  AssistantRole,
  { label: string; parentFlag: FlagName; parentLabel: string }
> = {
  "asst-web": {
    label: "Assistant Webmaster",
    parentFlag: "web",
    parentLabel: "Webmaster",
  },
  "asst-chief-instructor": {
    label: "Assistant Chief Instructor",
    parentFlag: "chief-instructor",
    parentLabel: "Chief Instructor",
  },
  "asst-events": {
    label: "Assistant Events Coordinator",
    parentFlag: "events",
    parentLabel: "Events Coordinator",
  },
  "asst-sector": {
    label: "Assistant Facility Engineer",
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
