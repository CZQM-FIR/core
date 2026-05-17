import { ASSISTANT_ROLE_INFO } from "./assistants";
import type { DB } from "./db";
import { User, formatUserDisplayName } from "./models/user";
import type { AssistantRole } from "@czqm/db/schema";

export type StaffAssistant = {
  cid: number;
  name: string;
  role: string;
};

export type StaffEntry = {
  name: string;
  role: string;
  email: string;
  cid: number;
  bio: string;
  assistants: StaffAssistant[];
};

/**
 * Staff page data: staff list (with role/email) and training team (instructors + mentors).
 * Used by the public staff page; logic lives here rather than on User since it's page-specific.
 */
export async function fetchStaffPageData(db: DB): Promise<{
  staff: StaffEntry[];
  trainingTeam: User[];
}> {
  const staffUsers = await User.fromFlag(db, "staff");
  const instructorUsers = await User.fromFlag(db, "instructor");
  const mentorUsers = await User.fromFlag(db, "mentor");

  const sorting: Record<string, number> = {
    chief: 5,
    deputy: 4,
    "chief-instructor": 3,
    events: 2,
    sector: 1,
    web: 0,
  };

  staffUsers.sort((a, b) => {
    let aScore = 0;
    let bScore = 0;
    for (const flag of a.flags) {
      if (flag.name in sorting)
        aScore = Math.max(aScore, sorting[flag.name as keyof typeof sorting]);
    }
    for (const flag of b.flags) {
      if (flag.name in sorting)
        bScore = Math.max(bScore, sorting[flag.name as keyof typeof sorting]);
    }
    return bScore - aScore;
  });

  const assistantRows = await db.query.assistants.findMany({
    with: {
      user: {
        with: {
          preferences: true,
        },
      },
    },
  });

  const assistantsByFlag = new Map<string, StaffAssistant[]>();
  const assistedFlags = new Set<string>();
  for (const row of assistantRows) {
    const info = ASSISTANT_ROLE_INFO[row.role as AssistantRole];
    if (!info) continue;
    const list = assistantsByFlag.get(info.parentFlag) ?? [];
    list.push({
      cid: row.cid,
      name: formatUserDisplayName(row.user.preferences, row.user),
      role: info.label,
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    assistantsByFlag.set(info.parentFlag, list);
    assistedFlags.add(info.parentFlag);
  }

  const staff: StaffEntry[] = [];
  staffUsers.forEach((user) => {
    const roles: string[] = [];
    let email: string | undefined;
    if (user.hasFlag("chief")) {
      roles.push("FIR Chief");
      email = email ?? "chief@czqm.ca";
    }
    if (user.hasFlag("deputy")) {
      roles.push("Deputy FIR Chief");
      email = email ?? "deputy@czqm.ca";
    }
    if (user.hasFlag("chief-instructor")) {
      roles.push("Chief Instructor");
      email = email ?? "instructor@czqm.ca";
    }
    if (user.hasFlag("web")) {
      roles.push("Webmaster");
      email = email ?? "webmaster@czqm.ca";
    }
    if (user.hasFlag("events")) {
      roles.push("Events Coordinator");
      email = email ?? "events@czqm.ca";
    }
    if (user.hasFlag("sector")) {
      roles.push("Facility Engineer");
      email = email ?? "engineer@czqm.ca";
    }
    const userAssistants: StaffAssistant[] = [];
    const seenAssistantCids = new Set<number>();
    for (const flag of [
      "chief",
      "deputy",
      "chief-instructor",
      "web",
      "events",
      "sector",
    ] as const) {
      if (!user.hasFlag(flag)) continue;
      const list = assistantsByFlag.get(flag);
      if (!list) continue;
      for (const a of list) {
        if (a.cid === user.cid || seenAssistantCids.has(a.cid)) continue;
        userAssistants.push(a);
        seenAssistantCids.add(a.cid);
      }
      // Mark this flag's assistants as accounted for so they don't appear
      // standalone at the bottom.
      assistedFlags.delete(flag);
    }

    staff.push({
      email: email ?? user.email,
      name: user.displayName,
      role: roles.join(" & "),
      cid: user.cid,
      bio: user.bio || "",
      assistants: userAssistants,
    });
  });

  // Orphan assistants: their parent staff role has no assigned staff member yet.
  // Render them as their own pseudo-entries so they still appear on the page.
  for (const flag of assistedFlags) {
    const list = assistantsByFlag.get(flag);
    if (!list) continue;
    for (const a of list) {
      staff.push({
        email: "",
        name: a.name,
        role: a.role,
        cid: a.cid,
        bio: "",
        assistants: [],
      });
    }
  }

  const trainingTeam = [...instructorUsers, ...mentorUsers];
  const chiefInstructor = (await User.fromFlag(db, "chief-instructor"))[0];
  const sortedTrainingTeam = [
    ...(chiefInstructor ? [chiefInstructor] : []),
    ...trainingTeam
      .filter((u) => !u.flags.some((f) => f.name === "chief-instructor"))
      .sort((a, b) => {
        const aScore = a.flags.some((f) => f.name === "instructor") ? 1 : 0;
        const bScore = b.flags.some((f) => f.name === "instructor") ? 1 : 0;
        if (bScore !== aScore) return bScore - aScore;
        return a.name_full.localeCompare(b.name_full);
      }),
  ];

  return { staff, trainingTeam: sortedTrainingTeam };
}
