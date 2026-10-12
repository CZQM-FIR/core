import { roster } from "@czqm/db/schema";
import { eq } from "drizzle-orm";
import type { DB } from "../db";
import type { FlagName } from "./user";
import {
  ensureUserFlag,
  getFlagIdByName,
  removeUserFlag,
  upsertRosterUser,
} from "./userWrite";

export type TestUserRosterPosition = "gnd" | "twr" | "app" | "ctr";

/** Roster status values: 0 = in training, 2 = certified. */
export const TEST_USER_ROSTER_STATUS = {
  training: 0,
  certified: 2,
} as const;

export type TestUserRosterEntry = {
  position: TestUserRosterPosition;
  status: (typeof TEST_USER_ROSTER_STATUS)[keyof typeof TEST_USER_ROSTER_STATUS];
};

export type TestUserDefinition = {
  cid: number;
  /** VATSIM rating label, e.g. "C1". Display only. */
  ratingLabel: string;
  ratingId: number;
  description: string;
  nameFirst: string;
  nameLast: string;
  flags: FlagName[];
  roster: TestUserRosterEntry[];
};

export type TestUserSeedResult = {
  cid: number;
  ratingLabel: string;
  description: string;
  flags: FlagName[];
  roster: TestUserRosterEntry[];
};

const certified = TEST_USER_ROSTER_STATUS.certified;
const training = TEST_USER_ROSTER_STATUS.training;

const ALL_POSITIONS_CERTIFIED: TestUserRosterEntry[] = [
  { position: "gnd", status: certified },
  { position: "twr", status: certified },
  { position: "app", status: certified },
  { position: "ctr", status: certified },
];

/** VATSIM Auth-Dev test users. */
export const TEST_USER_DEFINITIONS: readonly TestUserDefinition[] = [
  {
    cid: 10000005,
    ratingLabel: "C1",
    ratingId: 5,
    description: "FIR staff, home controller, certified on all positions",
    nameFirst: "Dev",
    nameLast: "Staff",
    flags: ["staff", "controller"],
    roster: ALL_POSITIONS_CERTIFIED,
  },
  {
    cid: 10000002,
    ratingLabel: "S1",
    ratingId: 2,
    description: "Home controller, certified ground, tower in training",
    nameFirst: "Dev",
    nameLast: "Student",
    flags: ["controller"],
    roster: [
      { position: "gnd", status: certified },
      { position: "twr", status: training },
    ],
  },
  {
    cid: 10000001,
    ratingLabel: "OBS",
    ratingId: 1,
    description: "Guest (not a home controller or visitor)",
    nameFirst: "Dev",
    nameLast: "Observer",
    flags: [],
    roster: [],
  },
  {
    cid: 10000006,
    ratingLabel: "C3",
    ratingId: 7,
    description: "Mentor, home controller, certified on all positions",
    nameFirst: "Dev",
    nameLast: "Mentor",
    flags: ["mentor", "controller"],
    roster: ALL_POSITIONS_CERTIFIED,
  },
  {
    cid: 10000007,
    ratingLabel: "I1",
    ratingId: 8,
    description: "Instructor, home controller, certified on all positions",
    nameFirst: "Dev",
    nameLast: "Instructor",
    flags: ["instructor", "controller"],
    roster: ALL_POSITIONS_CERTIFIED,
  },
  {
    cid: 10000004,
    ratingLabel: "S3",
    ratingId: 4,
    description: "Visitor, certified on ground, tower and approach",
    nameFirst: "Dev",
    nameLast: "Visitor",
    flags: ["visitor"],
    roster: [
      { position: "gnd", status: certified },
      { position: "twr", status: certified },
      { position: "app", status: certified },
    ],
  },
];

/** Flags this seeder owns; any of these not in a definition are removed on re-seed. */
const MANAGED_FLAGS: readonly FlagName[] = [
  "controller",
  "visitor",
  "staff",
  "instructor",
  "mentor",
];

/**
 * Inserts / resets the VATSIM Auth-Dev test users for local testing.
 * Idempotent: re-running restores each user to the defined state.
 */
export class TestUserSeeder {
  static get definitions(): readonly TestUserDefinition[] {
    return TEST_USER_DEFINITIONS;
  }

  static async seedAll(db: DB): Promise<TestUserSeedResult[]> {
    await TestUserSeeder.assertReferenceData(db);

    const results: TestUserSeedResult[] = [];
    for (const definition of TEST_USER_DEFINITIONS) {
      results.push(await TestUserSeeder.seedOne(db, definition));
    }
    return results;
  }

  private static async seedOne(
    db: DB,
    definition: TestUserDefinition,
  ): Promise<TestUserSeedResult> {
    await upsertRosterUser(db, {
      cid: definition.cid,
      firstName: definition.nameFirst,
      lastName: definition.nameLast,
      email: `${definition.cid}@example.invalid`,
      ratingId: definition.ratingId,
    });

    for (const flag of MANAGED_FLAGS) {
      if (!definition.flags.includes(flag)) {
        await removeUserFlag(db, definition.cid, flag);
      }
    }
    for (const flag of definition.flags) {
      await ensureUserFlag(db, definition.cid, flag);
    }

    await db.delete(roster).where(eq(roster.controllerId, definition.cid));
    if (definition.roster.length > 0) {
      await db.insert(roster).values(
        definition.roster.map((entry) => ({
          controllerId: definition.cid,
          position: entry.position,
          status: entry.status,
        })),
      );
    }

    return {
      cid: definition.cid,
      ratingLabel: definition.ratingLabel,
      description: definition.description,
      flags: definition.flags,
      roster: definition.roster,
    };
  }

  /** Fail early with a clear message if ratings/flags have not been seeded. */
  private static async assertReferenceData(db: DB): Promise<void> {
    const ratingIds = new Set(
      (await db.query.ratings.findMany({ columns: { id: true } })).map(
        (rating) => rating.id,
      ),
    );
    const missingRatings = [
      ...new Set(TEST_USER_DEFINITIONS.map((d) => d.ratingId)),
    ].filter((id) => !ratingIds.has(id));
    if (missingRatings.length > 0) {
      throw new Error(
        `Missing rating rows (${missingRatings.join(", ")}). Seed reference data first (apps/web/seed/seed.sql).`,
      );
    }

    const neededFlags = new Set<FlagName>(
      TEST_USER_DEFINITIONS.flatMap((d) => d.flags),
    );
    for (const flag of neededFlags) {
      try {
        await getFlagIdByName(db, flag);
      } catch {
        throw new Error(
          `Missing flag "${flag}". Seed reference data first (apps/web/seed/seed.sql).`,
        );
      }
    }
  }
}
