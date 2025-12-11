// Role priority mapping - ordered from highest to lowest priority
// OCP: Add new roles here without modifying getUserRole logic
export const ROLE_PRIORITY: ReadonlyArray<{
  flags: string[];
  role: string;
  requireAll?: boolean;
}> = [
  { flags: ["chief"], role: "FIR Chief" },
  { flags: ["deputy"], role: "Deputy FIR Chief" },
  { flags: ["chief-instructor"], role: "Chief Instructor" },
  { flags: ["web"], role: "Webmaster" },
  { flags: ["events"], role: "Events Coordinator" },
  { flags: ["sector"], role: "Facility Engineer" },
  { flags: ["instructor"], role: "Instructor" },
  { flags: ["mentor"], role: "Mentor" },
  {
    flags: ["visitor", "inactive"],
    role: "Inactive Visitor",
    requireAll: true,
  },
  {
    flags: ["controller", "inactive"],
    role: "Inactive Home Controller",
    requireAll: true,
  },
  { flags: ["visitor"], role: "Visitor" },
  { flags: ["controller"], role: "Home Controller" },
] as const;

export const DEFAULT_ROLE = "Guest";

// Rating to Discord role mapping
export const RATING_ROLE_MAP: Readonly<Record<string, string>> = {
  INAC: "Inactive",
  SUS: "Suspended",
  OBS: "Observer",
  S1: "Student 1",
  S2: "Student 2",
  S3: "Student 3",
  C1: "Controller 1",
  C3: "Controller 3",
  I1: "Instructor 1",
  I3: "Instructor 3",
  SUP: "Supervisor",
  ADM: "Admin",
} as const;

// Flag to Discord role mapping
export const FLAG_ROLE_MAP: Readonly<Record<string, string>> = {
  controller: "Home Controller",
  visitor: "Visitor",
  staff: "Staff",
  chief: "FIR Chief",
  deputy: "Deputy Chief",
  "chief-instructor": "Chief Instructor",
  events: "Events Coordinator",
  web: "Webmaster",
  sector: "Facility Engineer",
  instructor: "Instructor",
  mentor: "Mentor",
} as const;

// Flag IDs from database
export const FLAG_IDS: Readonly<Record<string, number>> = {
  visitor: 4,
  controller: 5,
  sector: 18,
  events: 19,
  web: 20,
  "chief-instructor": 21,
  deputy: 22,
  chief: 23,
  staff: 27,
} as const;

// Discord managed roles that can be automatically assigned/removed
export const MANAGED_DISCORD_ROLES: ReadonlyArray<string> = [
  "Guest",
  "Inactive",
  "Suspended",
  "Observer",
  "Student 1",
  "Student 2",
  "Student 3",
  "Controller 1",
  "Controller 3",
  "Instructor 1",
  "Instructor 3",
  "Supervisor",
  "Admin",
  "Home Controller",
  "Visitor",
  "Student",
  "Mentor",
  "Instructor",
  "Staff",
  "FIR Chief",
  "Deputy Chief",
  "Chief Instructor",
  "Events Coordinator",
  "Webmaster",
  "Facility Engineer",
] as const;

// Privileged roles for access control
export const PRIVILEGED_ROLES: ReadonlyArray<string> = [
  "instructor",
  "mentor",
  "staff",
] as const;

// Session configuration
export const SESSION_CONFIG = {
  /** Session duration in milliseconds (30 days) */
  DURATION_MS: 1000 * 60 * 60 * 24 * 30,
  /** Refresh window in milliseconds (15 days before expiry) */
  REFRESH_WINDOW_MS: 1000 * 60 * 60 * 24 * 15,
} as const;

// Position prefixes for CZQM FIR
export const CZQM_POSITION_PREFIXES: ReadonlyArray<string> = [
  "CZQM",
  "CZQX",
  "CYHZ",
  "CYQM",
  "CYYR",
  "CYZX",
  "CYYT",
  "CYFC",
  "CYSJ",
  "CYDF",
  "CYYG",
  "LFVP",
] as const;
