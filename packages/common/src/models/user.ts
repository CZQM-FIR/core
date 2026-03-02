import {
  preferences,
  type EnrolledUser,
  type Flag,
  type Position,
  type Preference as PreferenceRow,
  type Rating,
  type RosterStatus,
  type Session,
  type SoloEndorsement,
  type User as UserSchema,
  type WaitingUser,
  type Waitlist,
} from "@czqm/db/schema";
import { createDB, type DB } from "../db";
import { Env } from "../types";
import { validateSessionToken } from "../auth";

type UserData = UserSchema & {
  rating: Rating;
  flags: Flag[];
  preferences: PreferenceRow[];
  sessions: SessionWithPosition[];
  waitingPositions: WaitingUserWithWaitlist[];
  enrolledPositions: EnrolledUserWithWaitlist[];
  roster: RosterStatus[];
  soloEndorsements: SoloEndorsementWithPosition[];
};

type SessionWithPosition = Session & {
  position: Position;
};

type WaitingUserWithWaitlist = WaitingUser & {
  waitlist: Waitlist;
};

type EnrolledUserWithWaitlist = EnrolledUser & {
  waitlist: Waitlist;
};

export type RosterPositionStatus =
  | "nothing"
  | "training"
  | "solo"
  | "certified";

export type FlagName =
  | "delete"
  | "leave"
  | "inactive"
  | "activity-excempt"
  | "visitor"
  | "controller"
  | "fss"
  | "sector"
  | "events"
  | "web"
  | "chief-instructor"
  | "deputy"
  | "chief"
  | "mentor"
  | "instructor"
  | "staff-instructing"
  | "staff"
  | "admin";

type Preference =
  | "policyChanges"
  | "urgentFirUpdates"
  | "trainingUpdates"
  | "unauthorizedConnection"
  | "newEventPosted"
  | "newNewsArticlePosted"
  | "displayName";

type PreferenceValue<K extends Preference = Preference> =
  K extends "displayName" ? "full" | "cid" | "initial" : boolean;

export type SoloEndorsementWithPosition = SoloEndorsement & {
  position: Position;
};

/** Options for limiting which relations are loaded. Omitted options use per-method defaults (see each method). */
export type UserFetchOptions = {
  /** Include sessions (for hours). When true, can optionally limit or filter by date. */
  sessions?: boolean | { limit?: number; since?: Date };
  /** Include roster status per position. */
  roster?: boolean;
  /** Include waiting list positions (with waitlist). */
  waitingPositions?: boolean;
  /** Include enrolled positions (with waitlist). */
  enrolledPositions?: boolean;
  /** Include solo endorsements (with position). */
  soloEndorsements?: boolean;
};

/** Defaults for fromFlag: minimal load (roster only). */
const FROM_FLAG_DEFAULTS: Required<UserFetchOptions> = {
  sessions: false,
  roster: true,
  waitingPositions: false,
  enrolledPositions: false,
  soloEndorsements: false,
};

/** Defaults for fromCid/fromCids/fromSessionToken/resolve*: minimal load. Request additional relations explicitly. */
const FROM_CID_DEFAULTS: Required<UserFetchOptions> = {
  sessions: false,
  roster: false,
  waitingPositions: false,
  enrolledPositions: false,
  soloEndorsements: false,
};

/** Fetch only core profile + flags + preferences (no sessions, roster, waitlists, solo endorsements). This is the default for fromCid/fromCids/fromSessionToken/resolve*. */
export const USER_FETCH_MINIMAL: UserFetchOptions = {
  sessions: false,
  roster: false,
  waitingPositions: false,
  enrolledPositions: false,
  soloEndorsements: false,
};

/** Fetch full user including sessions, roster, waitlists, solo endorsements. Use when the caller needs hours, roster status, waitlist positions, or solo endorsements. */
export const USER_FETCH_FULL: UserFetchOptions = {
  sessions: true,
  roster: true,
  waitingPositions: true,
  enrolledPositions: true,
  soloEndorsements: true,
};

type ResolvedFetchOptions = {
  sessions: false | true | { limit?: number; since?: Date };
  roster: boolean;
  waitingPositions: boolean;
  enrolledPositions: boolean;
  soloEndorsements: boolean;
};

function resolveFetchOptions(
  options: UserFetchOptions | undefined,
  defaults: Required<UserFetchOptions>,
): ResolvedFetchOptions {
  return {
    sessions: options?.sessions ?? defaults.sessions,
    roster: options?.roster ?? defaults.roster,
    waitingPositions: options?.waitingPositions ?? defaults.waitingPositions,
    enrolledPositions: options?.enrolledPositions ?? defaults.enrolledPositions,
    soloEndorsements: options?.soloEndorsements ?? defaults.soloEndorsements,
  };
}

function buildUserWithClause(
  options: UserFetchOptions | undefined,
  defaults: Required<UserFetchOptions>,
) {
  const r = resolveFetchOptions(options, defaults);
  const sessionsInclude =
    r.sessions !== false
      ? {
          with: { position: true as const },
          where:
            r.sessions &&
            typeof r.sessions === "object" &&
            r.sessions.since != null
              ? { logonTime: { gte: r.sessions.since } }
              : undefined,
          limit:
            r.sessions &&
            typeof r.sessions === "object" &&
            r.sessions.limit != null
              ? r.sessions.limit
              : undefined,
          orderBy: (
            sessions: { logonTime: Date },
            { desc }: { desc: (c: unknown) => unknown },
          ) => [desc(sessions.logonTime)],
        }
      : false;
  return {
    rating: true,
    flags: true,
    preferences: true,
    sessions: sessionsInclude,
    waitingPositions: r.waitingPositions
      ? { with: { waitlist: true as const } }
      : false,
    enrolledPositions: r.enrolledPositions
      ? { with: { waitlist: true as const } }
      : false,
    soloEndorsements: r.soloEndorsements
      ? { with: { position: true as const } }
      : false,
    roster: r.roster,
  };
}

export class UserHours {
  private db: DB;
  private cid: number;
  private user: User;

  private static VISITOR_WAITLIST_NAME = "Visitors / Transfers";
  private static S1_WAITLIST_NAME = "S1";
  private static ACTIVITY_HOUR_REQUIREMENT = 3;

  sessions: SessionWithPosition[] = [];

  constructor(
    db: DB,
    cid: number,
    sessions: SessionWithPosition[],
    user: User,
  ) {
    this.db = db;
    this.cid = cid;
    this.sessions = sessions;
    this.user = user;
  }

  get localSessions() {
    return this.sessions.filter((session) => {
      const position = session.position;
      return position.callsign !== "EXTERNAL";
    });
  }

  get externalSessions() {
    return this.sessions.filter((session) => {
      const position = session.position;
      return position.callsign === "EXTERNAL";
    });
  }

  get total() {
    return this.localSessions.reduce(
      (total, session) => total + session.duration,
      0,
    );
  }

  private get thisQuarterSessions() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    return this.localSessions.filter((session) => {
      const sessionDate = new Date(session.logonTime);
      const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
      const sessionYear = sessionDate.getFullYear();
      return sessionQuarter === currentQuarter && sessionYear === currentYear;
    });
  }

  private get lastQuarterSessions() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const lastYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
    return this.localSessions.filter((session) => {
      const sessionDate = new Date(session.logonTime);
      const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
      const sessionYear = sessionDate.getFullYear();
      return sessionQuarter === lastQuarter && sessionYear === lastYear;
    });
  }

  private get thisQuarterExternalSessions() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    return this.externalSessions.filter((session) => {
      const sessionDate = new Date(session.logonTime);
      const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
      const sessionYear = sessionDate.getFullYear();
      return sessionQuarter === currentQuarter && sessionYear === currentYear;
    });
  }

  private get lastQuarterExternalSessions() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const lastYear = currentQuarter === 0 ? currentYear - 1 : currentYear;
    return this.externalSessions.filter((session) => {
      const sessionDate = new Date(session.logonTime);
      const sessionQuarter = Math.floor(sessionDate.getMonth() / 3);
      const sessionYear = sessionDate.getFullYear();
      return sessionQuarter === lastQuarter && sessionYear === lastYear;
    });
  }

  get thisQuarter() {
    return (
      this.thisQuarterSessions.reduce(
        (total, session) => total + session.duration,
        0,
      ) / 3600
    );
  }

  get thisQuarterExternal() {
    return (
      this.thisQuarterExternalSessions.reduce(
        (total, session) => total + session.duration,
        0,
      ) / 3600
    );
  }

  get lastQuarter() {
    return (
      this.lastQuarterSessions.reduce(
        (total, session) => total + session.duration,
        0,
      ) / 3600
    );
  }

  get lastQuarterExternal() {
    return (
      this.lastQuarterExternalSessions.reduce(
        (total, session) => total + session.duration,
        0,
      ) / 3600
    );
  }

  get thisMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return (
      this.localSessions.reduce((total, session) => {
        const sessionDate = new Date(session.logonTime);
        const sessionMonth = sessionDate.getMonth();
        const sessionYear = sessionDate.getFullYear();
        if (sessionMonth === currentMonth && sessionYear === currentYear) {
          return total + session.duration;
        } else {
          return total;
        }
      }, 0) / 3600
    );
  }

  get lastMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return (
      this.sessions.reduce((total, session) => {
        const sessionDate = new Date(session.logonTime);
        const sessionMonth = sessionDate.getMonth();
        const sessionYear = sessionDate.getFullYear();
        if (sessionMonth === lastMonth && sessionYear === lastYear) {
          return total + session.duration;
        } else {
          return total;
        }
      }, 0) / 3600
    );
  }

  get thisYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    return (
      this.localSessions.reduce((total, session) => {
        const sessionDate = new Date(session.logonTime);
        const sessionYear = sessionDate.getFullYear();
        if (sessionYear === currentYear) {
          return total + session.duration;
        } else {
          return total;
        }
      }, 0) / 3600
    );
  }

  get lastYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    return (
      this.localSessions.reduce((total, session) => {
        const sessionDate = new Date(session.logonTime);
        const sessionYear = sessionDate.getFullYear();
        if (sessionYear === lastYear) {
          return total + session.duration;
        } else {
          return total;
        }
      }, 0) / 3600
    );
  }

  get allTime() {
    return (
      this.localSessions.reduce(
        (total, session) => total + session.duration,
        0,
      ) / 3600
    );
  }

  get thisActivityHours() {
    if (this.user.rating.id < 4) {
      // All quater hours for S1 and S2
      return this.thisQuarter;
    } else {
      // Only radar hours for S3 and above
      return (
        this.thisQuarterSessions
          .filter((s) => {
            const position = s.position;
            return !(
              position.callsign.includes("DEL") ||
              position.callsign.includes("GND") ||
              position.callsign.includes("TWR")
            );
          })
          .reduce((total, session) => total + session.duration, 0) / 3600
      );
    }
  }

  get lastActivityHours() {
    if (this.user.rating.id < 4) {
      // All quater hours for S1 and S2
      return this.lastQuarter;
    } else {
      // Only radar hours for S3 and above
      return (
        this.lastQuarterSessions

          .filter((s) => {
            const position = s.position;
            return !(
              position.callsign.includes("DEL") ||
              position.callsign.includes("GND") ||
              position.callsign.includes("TWR")
            );
          })
          .reduce((total, session) => total + session.duration, 0) / 3600
      );
    }
  }

  get meetingActivityRequirement() {
    if (this.user.hasFlag("visitor")) {
      if (
        this.user.waitlistPositions.some(
          (wp) => wp.waitlist.name === "Visitors / Transfers",
        ) ||
        this.user.enrolledPositions.some(
          (ep) =>
            ep.waitlist.name === "Visitors / Transfers" && ep.hiddenAt === null,
        )
      ) {
        // Visitor is currently on the Visitors/Transfers waitlist or in training
        // Doesn't have the ability to control therefore exempt from activity requirement
        return true;
      }

      if (
        3 <= this.thisActivityHours &&
        this.thisActivityHours < this.thisQuarterExternal
      ) {
        return true;
      } else {
        return false;
      }
    } else if (this.user.hasFlag("controller")) {
      if (
        this.user.waitlistPositions.some((wp) => wp.waitlist.name === "S1") ||
        this.user.enrolledPositions.some(
          (ep) => ep.waitlist.name === "S1" && ep.hiddenAt === null,
        )
      ) {
        // Controller is currently on the S1 waitlist or in training
        // Doesn't have the ability to control therefore exempt from activity requirement
        return true;
      } else {
        if (
          3 <= this.thisActivityHours &&
          this.thisActivityHours > this.thisQuarterExternal
        ) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }

  get metActivityRequirementLastQuarter() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentYear = now.getFullYear();
    const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const lastQuarterYear =
      currentQuarter === 0 ? currentYear - 1 : currentYear;
    const lastQuarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
    if (this.user.hasFlag("visitor")) {
      if (
        this.user.waitlistPositions.some(
          (wp) => wp.waitlist.name === "Visitors / Transfers",
        ) ||
        this.user.enrolledPositions.some(
          (ep) =>
            ep.waitlist.name === "Visitors / Transfers" &&
            (ep.hiddenAt === null || ep.hiddenAt >= lastQuarterStart),
        )
      ) {
        // Visitor is currently on the Visitors/Transfers waitlist or in training
        // Doesn't have the ability to control therefore exempt from activity requirement
        return true;
      }

      if (
        3 <= this.lastActivityHours &&
        this.lastActivityHours < this.lastQuarterExternal
      ) {
        return true;
      } else {
        return false;
      }
    } else if (this.user.hasFlag("controller")) {
      if (
        this.user.waitlistPositions.some((wp) => wp.waitlist.name === "S1") ||
        this.user.enrolledPositions.some(
          (ep) =>
            ep.waitlist.name === "S1" &&
            (ep.hiddenAt === null || ep.hiddenAt >= lastQuarterStart),
        )
      ) {
        // Controller is currently on the S1 waitlist or in training
        // Doesn't have the ability to control therefore exempt from activity requirement
        return true;
      } else {
        if (
          3 <= this.lastActivityHours &&
          this.lastActivityHours > this.thisQuarterExternal
        ) {
          return true;
        } else {
          return false;
        }
      }
    } else {
      return false;
    }
  }
}

export class User {
  private db: DB;

  cid: number;
  name_first: string;
  name_last: string;
  name_full: string;
  email: string;
  rating: {
    id: number;
    short: string;
    long: string;
  };
  division: string | null;
  region: string | null;
  subdivision: string | null;
  bio: string | null;
  discord_id: number | null;
  active: "active" | "inactive" | "loa";
  hoursLastUpdated: Date;

  waitlistPositions: WaitingUserWithWaitlist[] = [];
  enrolledPositions: EnrolledUserWithWaitlist[] = [];

  hours: UserHours;
  roster: RosterStatus[] = [];
  flags: Flag[] = [];

  private flagNames: FlagName[] = [];
  private userFetchedAt: Date;
  private sessionsList: SessionWithPosition[] = [];
  private preferencesList: PreferenceRow[] = [];
  private soloEndorsementsList: SoloEndorsementWithPosition[] = [];

  private static defaultOnPreferences: Preference[] = [
    "policyChanges",
    "urgentFirUpdates",
    "trainingUpdates",
    "unauthorizedConnection",
  ];

  private constructor(db: DB, data: UserData) {
    this.db = db;
    this.cid = data.cid;
    this.name_first = data.name_first;
    this.name_last = data.name_last;
    this.name_full = data.name_full;
    this.email = data.email;
    this.rating = {
      id: data.rating.id,
      short: data.rating.short,
      long: data.rating.long,
    };
    this.division = data.division;
    this.region = data.region;
    this.subdivision = data.subdivision;
    this.bio = data.bio;
    this.discord_id = data.discord_id;
    this.hoursLastUpdated = data.hoursLastUpdated;
    this.userFetchedAt = new Date();
    this.flagNames = data.flags.map((f) => f.name as FlagName);
    this.flags = data.flags;
    this.preferencesList = data.preferences ?? [];
    this.sessionsList = data.sessions ?? [];
    this.roster = data.roster;
    this.soloEndorsementsList = data.soloEndorsements;

    this.hours = new UserHours(this.db, this.cid, this.sessionsList, this);

    switch (data.active) {
      case 1:
        this.active = "active";
        break;
      case 0:
        this.active = "inactive";
        break;
      case -1:
        this.active = "loa";
        break;
      default:
        throw new Error(`Invalid active value: ${data.active}`);
    }
  }

  static async fromCid(
    db: DB,
    cid: number,
    options?: UserFetchOptions,
  ): Promise<User | null> {
    const withClause = buildUserWithClause(options, FROM_CID_DEFAULTS);
    const row = await db.query.users.findFirst({
      where: { cid },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- with clause built from UserFetchOptions
      with: withClause as any,
    });

    if (!row || !(row as UserData).rating) return null;

    return new User(db, row as UserData);
  }

  static async fromCids(
    db: DB,
    cids: number[],
    options?: UserFetchOptions,
  ): Promise<User[]> {
    if (cids.length === 0) return [];

    const uniqueCids = [...new Set(cids)];
    const withClause = buildUserWithClause(options, FROM_CID_DEFAULTS);
    const data = await db.query.users.findMany({
      where: { cid: { in: uniqueCids } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- with clause built from UserFetchOptions
      with: withClause as any,
    });

    return data
      .filter((row) => row != null && (row as UserData).rating != null)
      .map((row) => new User(db, row as UserData));
  }

  static async fromFlag(
    db: DB,
    flag: FlagName | FlagName[],
    options?: UserFetchOptions,
  ): Promise<User[]> {
    const flagsToCheck = Array.isArray(flag) ? flag : [flag];
    const withClause = buildUserWithClause(options, FROM_FLAG_DEFAULTS);

    const data = await db.query.users.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- with clause built from UserFetchOptions; DB query config type is complex
      with: withClause as any,
      where: {
        flags: { name: { in: flagsToCheck } },
      },
    });

    return data.map((userData) => {
      const userDataTyped: UserData = {
        ...userData,
        sessions: (userData as UserData).sessions ?? [],
      } as UserData;
      return new User(db, userDataTyped);
    });
  }

  static async fetchTopControllersForCurrentMonth(db: DB, limit = 5) {
    const controllers = await User.fromFlag(db, ["controller", "visitor"], {
      sessions: { limit: 100 },
    });

    return controllers
      .filter((c) => c.hours.thisMonth > 0)
      .sort((a, b) => b.hours.thisMonth - a.hours.thisMonth)
      .slice(0, limit)
      .map((controller) => controller.serialize());
  }

  static async fetchControllerVisitorActivitySummary(db: DB) {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const lastQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const lastQuarterYear =
      currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const sessionsSince = new Date(lastQuarterYear, lastQuarter * 3, 1);

    const users = await User.fromFlag(db, ["controller", "visitor"], {
      sessions: { since: sessionsSince },
      waitingPositions: true,
      enrolledPositions: true,
      soloEndorsements: true,
    });

    return users.map((u) => ({
      cid: u.cid,
      name_full: u.name_full,
      rating: u.rating,
      role: u.role,
      active: u.active,
      isActivityExempt: u.isActivityExempt,
      hours: {
        thisQuarter: u.hours.thisQuarter,
        lastQuarter: u.hours.lastQuarter,
        activityHours: u.hours.thisActivityHours,
        lastQuarterActivityHours: u.hours.lastActivityHours,
        thisQuarterExternal: u.hours.thisQuarterExternal,
        lastQuarterExternal: u.hours.lastQuarterExternal,
        meetingActivityRequirement: u.hours.meetingActivityRequirement,
        metActivityRequirementLastQuarter:
          u.hours.metActivityRequirementLastQuarter,
      },
    }));
  }

  /**
   * Public controller profile by cid. Returns null if user not found or not controller/visitor.
   */
  static async fetchControllerProfileForPublic(
    db: DB,
    cid: number,
  ): Promise<{
    cid: number;
    displayName: string;
    rating: User["rating"];
    roster: { gnd: RosterPositionStatus; twr: RosterPositionStatus; app: RosterPositionStatus; ctr: RosterPositionStatus };
    active: User["active"];
    sessions: SessionWithPosition[];
    bio: string | null;
    role: string;
  } | null> {
    const user = await User.fromCid(db, cid, USER_FETCH_FULL);
    if (!user || !user.hasFlag(["controller", "visitor"])) {
      return null;
    }
    return {
      cid: user.cid,
      displayName: user.displayName,
      rating: user.rating,
      roster: {
        gnd: user.getRosterStatus("gnd"),
        twr: user.getRosterStatus("twr"),
        app: user.getRosterStatus("app"),
        ctr: user.getRosterStatus("ctr"),
      },
      active: user.active,
      sessions: user.sessionsList as SessionWithPosition[],
      bio: user.bio,
      role: user.role,
    };
  }

  static async fromSessionToken(
    db: DB,
    token: string,
    fetchOptions?: UserFetchOptions,
  ): Promise<User | null> {
    const validation = await validateSessionToken(db, token);
    if (!validation.user) return null;
    return await User.fromCid(db, validation.user.cid, fetchOptions);
  }

  static async resolveAuthenticatedUser(
    db: DB,
    options: {
      cid?: number | null;
      sessionToken?: string | null;
      fetch?: UserFetchOptions;
    },
  ): Promise<User | null> {
    const fetchOpts = options.fetch;
    if (typeof options.cid === "number") {
      return await User.fromCid(db, options.cid, fetchOpts);
    }

    if (options.sessionToken) {
      return await User.fromSessionToken(db, options.sessionToken, fetchOpts);
    }

    return null;
  }

  static async resolveAuthorizedUser(
    db: DB,
    options: {
      cid?: number | null;
      sessionToken?: string | null;
      requiredFlags: FlagName | FlagName[];
      fetch?: UserFetchOptions;
    },
  ): Promise<User | null> {
    const user = await User.resolveAuthenticatedUser(db, options);

    if (!user || !user.hasFlag(options.requiredFlags)) {
      return null;
    }

    return user;
  }

  async refresh() {
    const row = await this.db.query.users.findFirst({
      where: { cid: this.cid },
      with: {
        rating: true,
        sessions: {
          with: {
            position: true,
          },
        },
        flags: true,
        preferences: true,
        waitingPositions: {
          with: {
            waitlist: true,
          },
        },
        enrolledPositions: {
          with: { waitlist: true },
        },
        soloEndorsements: true,
        roster: true,
      },
    });

    if (!row || !row.rating)
      throw new Error(`User with cid ${this.cid} not found`);

    const data = row as UserData;
    this.cid = data.cid;
    this.name_first = data.name_first;
    this.name_last = data.name_last;
    this.name_full = data.name_full;
    this.email = data.email;
    this.rating = {
      id: data.rating.id,
      short: data.rating.short,
      long: data.rating.long,
    };
    this.division = data.division;
    this.region = data.region;
    this.subdivision = data.subdivision;
    this.bio = data.bio;
    this.discord_id = data.discord_id;
    this.hoursLastUpdated = data.hoursLastUpdated;
    this.flagNames = data.flags.map((f) => f.name as FlagName);
    this.flags = data.flags;
    this.preferencesList = data.preferences ?? [];
    this.sessionsList = data.sessions ?? [];
    this.hours.sessions = this.sessionsList;
    this.roster = data.roster;
    this.soloEndorsementsList = data.soloEndorsements;

    switch (data.active) {
      case 1:
        this.active = "active";
        break;
      case 0:
        this.active = "inactive";
        break;
      case -1:
        this.active = "loa";
        break;
      default:
        throw new Error(`Invalid active value: ${data.active}`);
    }
  }

  getPreference<K extends Preference>(key: K): PreferenceValue<K> {
    const pref = this.preferencesList.find((p) => p.key === key);

    if (!pref) {
      if (key === "displayName") {
        return "full" as PreferenceValue<K>;
      } else {
        return (
          User.defaultOnPreferences.includes(key) ? true : false
        ) as PreferenceValue<K>;
      }
    } else {
      if (key === "displayName") {
        const value = pref.value as PreferenceValue<K>;
        return value === "full" || value === "initial" || value === "cid"
          ? value
          : ("full" as PreferenceValue<K>);
      }

      return (pref.value === "true") as PreferenceValue<K>;
    }
  }

  getAllPreferences() {
    const allKeys: Preference[] = [
      "policyChanges",
      "urgentFirUpdates",
      "trainingUpdates",
      "unauthorizedConnection",
      "newEventPosted",
      "newNewsArticlePosted",
      "displayName",
    ];
    const preferences: Record<Preference, PreferenceValue> = {} as Record<
      Preference,
      PreferenceValue
    >;
    for (const key of allKeys) {
      preferences[key] = this.getPreference(key);
    }
    return preferences;
  }

  setPreference<K extends Preference>(key: K, value: PreferenceValue<K>) {
    const valueToStore =
      typeof value === "boolean"
        ? value
          ? "true"
          : "false"
        : value.toString();
    return this.db
      .insert(preferences)
      .values({
        cid: this.cid,
        key,
        value: valueToStore,
      })
      .onConflictDoUpdate({
        target: [preferences.cid, preferences.key],
        set: { value: valueToStore },
      });
  }

  get sessions() {
    return this.sessionsList;
  }

  get soloEndorsements() {
    return this.soloEndorsementsList;
  }

  hasFlag(flag: FlagName | FlagName[]) {
    const flagsToCheck = Array.isArray(flag) ? flag : [flag];
    return this.flagNames.some((f) => flagsToCheck.includes(f));
  }

  get role() {
    if (this.hasFlag("chief")) return "FIR Chief";
    else if (this.hasFlag("deputy")) return "Deputy FIR Chief";
    else if (this.hasFlag("chief-instructor")) return "Chief Instructor";
    else if (this.hasFlag("web")) return "Webmaster";
    else if (this.hasFlag("events")) return "Events Coordinator";
    else if (this.hasFlag("sector")) return "Facility Engineer";
    else if (this.hasFlag("instructor")) return "Instructor";
    else if (this.hasFlag("mentor")) return "Mentor";
    else if (this.hasFlag("visitor") && this.hasFlag("inactive"))
      return "Inacvtive Visitor";
    else if (this.hasFlag("controller") && this.hasFlag("inactive"))
      return "Inacvtive Home Controller";
    else if (this.hasFlag("visitor")) return "Visitor";
    else if (this.hasFlag("controller")) return "Home Controller";
    else return "Guest";
  }

  get isActivityExempt() {
    return this.hasFlag(["activity-excempt", "staff"]);
  }

  getRosterStatus(
    position: "gnd" | "twr" | "app" | "ctr",
  ): RosterPositionStatus {
    const roster = this.roster ?? [];
    const soloEndorsementsList = this.soloEndorsementsList ?? [];
    if (
      roster.filter((r: RosterStatus) => r.position === position)
        .length === 0
    ) {
      return "nothing"; // N/A
    } else if (
      soloEndorsementsList.filter((r: any) => {
        if (
          r.position?.callsign.toLowerCase().includes(position) &&
          r.expiresAt > new Date().getTime()
        ) {
          return true;
        }
      }).length > 0
    ) {
      return "solo"; // solo
    } else if (
      roster.filter((r: RosterStatus) => r.position === position)[0]
        .status === 0
    ) {
      return "training"; // training
    } else if (
      roster.filter((r: RosterStatus) => r.position === position)[0]
        .status === 2
    ) {
      return "certified"; // certified
    } else {
      return "nothing"; // N/A
    }
  }

  get displayName() {
    const displayPreference = this.getPreference("displayName");

    switch (displayPreference) {
      case "full":
        return this.name_full;
      case "initial":
        return `${this.name_first} ${this.name_last[0]}`;
      case "cid":
        return this.cid.toString();
      default:
        return this.name_full;
    }
  }

  /**
   * Serialize to a plain object for transport/serialization
   */
  serialize() {
    return {
      cid: this.cid,
      name_first: this.name_first,
      name_last: this.name_last,
      name_full: this.name_full,
      displayName: this.displayName,
      hours: {
        thisMonth: this.hours.thisMonth,
      },
    };
  }

  /**
   * toJSON is automatically called during JSON.stringify and SvelteKit serialization
   * This ensures the User class can be properly serialized for client-side use
   */
  toJSON() {
    return {
      cid: this.cid,
      name_first: this.name_first,
      name_last: this.name_last,
      name_full: this.name_full,
      email: this.email,
      rating: this.rating,
      division: this.division,
      region: this.region,
      subdivision: this.subdivision,
      bio: this.bio,
      discord_id: this.discord_id,
      active: this.active,
      hoursLastUpdated: this.hoursLastUpdated,
      waitlistPositions: this.waitlistPositions,
      enrolledPositions: this.enrolledPositions,
      flags: this.flags,
      sessions: this.sessionsList,
      soloEndorsements: this.soloEndorsementsList,
      roster: this.roster,
      displayName: this.displayName,
      role: this.role,
      isActivityExempt: this.isActivityExempt,
      hours: {
        total: this.hours.total,
        thisQuarter: this.hours.thisQuarter,
        lastQuarter: this.hours.lastQuarter,
        thisMonth: this.hours.thisMonth,
        lastMonth: this.hours.lastMonth,
        thisActivityHours: this.hours.thisActivityHours,
        meetingActivityRequirement: this.hours.meetingActivityRequirement,
      },
    };
  }
}
