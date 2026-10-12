import {
  bookings,
  positions,
  trainingSessions,
  type BookingFacility,
  type BookingPolicyKind,
  type BookingRow,
  type BookingStatus,
  type BookingVatsimType,
} from "@czqm/db/schema";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import type { Env } from "../types";
import type { DB } from "../db";
import {
  type BookingPolicy,
  BookingPolicyFactory,
  type BookingPolicyIntent,
  policyForKind,
  resolveBookingVatsimType,
} from "../bookings/bookingPolicy";
import {
  formatBookingTimesForVatsim,
  VatsimBookingsApi,
} from "../bookings/vatsimBookingsApi";
import { User } from "./user";

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["active"];

/** Fields safe to send to the public bookings page. */
export type BookingPublicSummary = {
  id: number;
  cid: number;
  callsign: string;
  startsAt: Date;
  endsAt: Date;
  facility: BookingFacility;
  status: BookingStatus;
};

export type BookingSummary = BookingPublicSummary & {
  vatsimType: BookingVatsimType;
  policyKind: BookingPolicyKind;
  createdByCid: number;
  trainingSessionId: number | null;
  vatsimBookingId: number | null;
  checkedInAt: Date | null;
};

type CreateBookingInput = {
  actor: User;
  cid: number;
  callsign: string;
  startsAt: Date;
  endsAt: Date;
  facility: BookingFacility;
  trainingSessionId?: number | null;
  intent?: BookingPolicyIntent;
  now?: Date;
};

type UpdateBookingInput = {
  actor: User;
  startsAt: Date;
  endsAt: Date;
  now?: Date;
};

type CancelBookingInput = {
  actor: User;
};

function normalizeCallsign(callsign: string): string {
  const trimmed = callsign.trim().toUpperCase();
  if (!trimmed) {
    throw new Error("Callsign is required");
  }
  return trimmed;
}

function activeBookingOverlapSql(
  callsign: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: number,
) {
  const conditions = [
    eq(bookings.callsign, callsign),
    eq(bookings.status, "active"),
    lt(bookings.startsAt, endsAt),
    gt(bookings.endsAt, startsAt),
  ];
  if (excludeBookingId != null) {
    conditions.push(ne(bookings.id, excludeBookingId));
  }
  return and(...conditions);
}

export function canCancelBooking(actor: User, row: BookingRow): boolean {
  if (row.status !== "active") {
    return false;
  }
  if (row.cid === actor.cid || row.createdByCid === actor.cid) {
    return true;
  }
  return actor.hasFlag([
    "staff",
    "staff-instructing",
    "instructor",
    "mentor",
    "chief-instructor",
    "admin",
  ]);
}

export class Booking {
  private _row: BookingRow;
  private db: DB;
  private env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">;

  private constructor(
    db: DB,
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    row: BookingRow,
  ) {
    this.db = db;
    this.env = env;
    this._row = row;
  }

  get row(): BookingRow {
    return this._row;
  }

  static toSummary(row: BookingRow): BookingSummary {
    return {
      id: row.id,
      cid: row.cid,
      callsign: row.callsign,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      facility: row.facility,
      vatsimType: row.vatsimType,
      policyKind: row.policyKind,
      status: row.status,
      createdByCid: row.createdByCid,
      trainingSessionId: row.trainingSessionId,
      vatsimBookingId: row.vatsimBookingId,
      checkedInAt: row.checkedInAt,
    };
  }

  static toPublicSummary(row: BookingRow): BookingPublicSummary {
    return {
      id: row.id,
      cid: row.cid,
      callsign: row.callsign,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      facility: row.facility,
      status: row.status,
    };
  }

  static async fetchById(
    db: DB,
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    bookingId: number,
  ): Promise<Booking | null> {
    const [row] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);
    if (!row) return null;
    return new Booking(db, env, row);
  }

  static async fetchByTrainingSessionId(
    db: DB,
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    trainingSessionId: number,
  ): Promise<Booking | null> {
    const [row] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.trainingSessionId, trainingSessionId))
      .limit(1);
    if (!row) return null;
    return new Booking(db, env, row);
  }

  static async fetchActiveInRange(
    db: DB,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<BookingRow[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.status, "active"),
          lt(bookings.startsAt, windowEnd),
          gt(bookings.endsAt, windowStart),
        ),
      )
      .orderBy(bookings.startsAt);
  }

  /** Active bookings whose linked training session was cancelled or declined. */
  static async fetchActiveForClosedTrainingSessions(
    db: DB,
  ): Promise<BookingRow[]> {
    const rows = await db
      .select({ booking: bookings })
      .from(bookings)
      .innerJoin(
        trainingSessions,
        eq(bookings.trainingSessionId, trainingSessions.id),
      )
      .where(
        and(
          eq(bookings.status, "active"),
          inArray(trainingSessions.status, ["cancelled", "declined"]),
        ),
      );
    return rows.map((row) => row.booking);
  }

  static async fetchUpcomingActive(
    db: DB,
    from = new Date(),
  ): Promise<BookingRow[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.status, "active"), gt(bookings.endsAt, from)),
      )
      .orderBy(bookings.startsAt);
  }

  private static async assertKnownCallsign(
    db: DB,
    callsign: string,
  ): Promise<void> {
    const [position] = await db
      .select({ callsign: positions.callsign })
      .from(positions)
      .where(eq(positions.callsign, callsign))
      .limit(1);
    if (!position) {
      throw new Error("Unknown callsign");
    }
  }

  private static async assertNoActiveOverlap(
    db: DB,
    callsign: string,
    startsAt: Date,
    endsAt: Date,
    excludeBookingId?: number,
  ): Promise<void> {
    const [overlap] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        activeBookingOverlapSql(callsign, startsAt, endsAt, excludeBookingId),
      )
      .limit(1);
    if (overlap) {
      throw new Error(
        "Another active booking already exists for this callsign during that time",
      );
    }
  }

  /**
   * Self-bookings (controller policy) require certification or a valid solo
   * endorsement for the position. Training-linked bookings are exempt.
   */
  private static async assertQualifiedForPosition(
    db: DB,
    policy: BookingPolicy,
    cid: number,
    callsign: string,
  ): Promise<void> {
    if (policy.kind !== "controller") return;

    const booked = await User.fromCid(db, cid, {
      roster: true,
      soloEndorsements: true,
    });
    if (!booked || !booked.isQualifiedForPosition(callsign)) {
      throw new Error(
        "You can only book positions you are certified for or hold a solo endorsement for",
      );
    }
  }

  /** Staff are exempt from the booked-time limit. */
  private static isExemptFromBookedTimeLimit(actor: User): boolean {
    return actor.hasFlag(["staff", "admin"]);
  }

  /**
   * Enforces the policy's rolling booked-time limit against the booked person's
   * other active self-bookings (training-linked bookings don't count).
   */
  private static async assertWithinBookedTimeLimit(
    db: DB,
    policy: BookingPolicy,
    actor: User,
    cid: number,
    candidate: { startsAt: Date; endsAt: Date },
    excludeBookingId?: number,
  ): Promise<void> {
    if (policy.maxBookedMsPerWindow == null) return;
    if (Booking.isExemptFromBookedTimeLimit(actor)) return;

    const conditions = [
      eq(bookings.cid, cid),
      eq(bookings.status, "active"),
      eq(bookings.policyKind, policy.kind),
      lt(bookings.startsAt, new Date(candidate.endsAt.getTime() + policy.bookedWindowMs)),
      gt(bookings.endsAt, new Date(candidate.startsAt.getTime() - policy.bookedWindowMs)),
    ];
    if (excludeBookingId != null) {
      conditions.push(ne(bookings.id, excludeBookingId));
    }

    const existing = await db
      .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
      .from(bookings)
      .where(and(...conditions));

    policy.assertWithinBookedTimeLimit(existing, candidate);
  }

  private static async syncCreateToVatsim(
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    row: Pick<
      BookingRow,
      "cid" | "callsign" | "startsAt" | "endsAt" | "vatsimType"
    >,
  ): Promise<number> {
    const api = VatsimBookingsApi.fromEnv(env);
    const times = formatBookingTimesForVatsim(row.startsAt, row.endsAt);
    const created = await api.create({
      cid: row.cid,
      callsign: row.callsign,
      start: times.start,
      end: times.end,
      type: row.vatsimType,
    });
    return created.id;
  }

  private static async syncUpdateToVatsim(
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    vatsimBookingId: number,
    row: Pick<
      BookingRow,
      "cid" | "callsign" | "startsAt" | "endsAt" | "vatsimType"
    >,
  ): Promise<void> {
    const api = VatsimBookingsApi.fromEnv(env);
    const times = formatBookingTimesForVatsim(row.startsAt, row.endsAt);
    await api.update(vatsimBookingId, {
      cid: row.cid,
      callsign: row.callsign,
      start: times.start,
      end: times.end,
      type: row.vatsimType,
    });
  }

  private static async syncDeleteFromVatsim(
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    vatsimBookingId: number,
  ): Promise<void> {
    const api = VatsimBookingsApi.fromEnv(env);
    await api.delete(vatsimBookingId);
  }

  static async create(
    db: DB,
    env: Pick<Env, "VATSIM_BOOKINGS_API_TOKEN">,
    input: CreateBookingInput,
  ): Promise<Booking> {
    const now = input.now ?? new Date();
    const callsign = normalizeCallsign(input.callsign);
    const linkedTraining =
      input.intent?.linkedTraining === true ||
      input.trainingSessionId != null;
    const policy = BookingPolicyFactory.forActor(input.actor, {
      ...input.intent,
      linkedTraining,
    });

    await Booking.assertKnownCallsign(db, callsign);

    policy.assertCanCreate(
      {
        cid: input.cid,
        callsign,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        facility: input.facility,
      },
      now,
    );

    await Booking.assertQualifiedForPosition(db, policy, input.cid, callsign);

    await Booking.assertNoActiveOverlap(
      db,
      callsign,
      input.startsAt,
      input.endsAt,
    );

    await Booking.assertWithinBookedTimeLimit(db, policy, input.actor, input.cid, {
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    });

    const vatsimType = resolveBookingVatsimType(policy, input.facility);
    let vatsimBookingId: number | null = null;

    if (input.facility === "live") {
      vatsimBookingId = await Booking.syncCreateToVatsim(env, {
        cid: input.cid,
        callsign,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        vatsimType,
      });
    }

    const timestamp = new Date();
    try {
      const [row] = await db
        .insert(bookings)
        .values({
          vatsimBookingId,
          cid: input.cid,
          callsign,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          facility: input.facility,
          vatsimType,
          policyKind: policy.kind,
          status: "active",
          createdByCid: input.actor.cid,
          trainingSessionId: input.trainingSessionId ?? null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      return new Booking(db, env, row);
    } catch (error) {
      if (vatsimBookingId != null) {
        try {
          await Booking.syncDeleteFromVatsim(env, vatsimBookingId);
        } catch (cleanupError) {
          console.error("Failed to roll back VATSIM booking after DB error", {
            vatsimBookingId,
            cleanupError,
          });
        }
      }
      throw error;
    }
  }

  get policy() {
    return policyForKind(this._row.policyKind);
  }

  async update(input: UpdateBookingInput): Promise<BookingRow> {
    if (this.row.status !== "active") {
      throw new Error("Only active bookings can be updated");
    }

    const now = input.now ?? new Date();
    this.policy.assertCanCreate(
      {
        cid: this.row.cid,
        callsign: this.row.callsign,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        facility: this.row.facility,
      },
      now,
    );

    await Booking.assertNoActiveOverlap(
      this.db,
      this.row.callsign,
      input.startsAt,
      input.endsAt,
      this.row.id,
    );

    await Booking.assertWithinBookedTimeLimit(
      this.db,
      this.policy,
      input.actor,
      this.row.cid,
      { startsAt: input.startsAt, endsAt: input.endsAt },
      this.row.id,
    );

    const vatsimType = resolveBookingVatsimType(this.policy, this.row.facility);

    if (this.row.facility === "live" && this.row.vatsimBookingId != null) {
      await Booking.syncUpdateToVatsim(this.env, this.row.vatsimBookingId, {
        cid: this.row.cid,
        callsign: this.row.callsign,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        vatsimType,
      });
    }

    const [updated] = await this.db
      .update(bookings)
      .set({
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        vatsimType,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, this.row.id))
      .returning();

    this._row = updated;
    return updated;
  }

  /**
   * Put the booking back on previous times (e.g. after a failed session reschedule).
   * Skips policy checks because the previous times were already valid when created.
   */
  async restoreTimes(startsAt: Date, endsAt: Date): Promise<BookingRow> {
    if (this.row.status !== "active") {
      throw new Error("Only active bookings can be restored");
    }

    if (this.row.facility === "live" && this.row.vatsimBookingId != null) {
      await Booking.syncUpdateToVatsim(this.env, this.row.vatsimBookingId, {
        cid: this.row.cid,
        callsign: this.row.callsign,
        startsAt,
        endsAt,
        vatsimType: this.row.vatsimType,
      });
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ startsAt, endsAt, updatedAt: new Date() })
      .where(eq(bookings.id, this.row.id))
      .returning();

    this._row = updated;
    return updated;
  }

  async cancel(input: CancelBookingInput): Promise<BookingRow> {
    if (this.row.status !== "active") {
      throw new Error("Only active bookings can be cancelled");
    }
    if (!canCancelBooking(input.actor, this.row)) {
      throw new Error("You are not allowed to cancel this booking");
    }

    return this.applyCancel();
  }

  /** Cancel without an actor (maintenance / reconciliation jobs). */
  async cancelBySystem(): Promise<BookingRow> {
    if (this.row.status !== "active") {
      throw new Error("Only active bookings can be cancelled");
    }
    return this.applyCancel();
  }

  private async applyCancel(): Promise<BookingRow> {
    if (this.row.facility === "live" && this.row.vatsimBookingId != null) {
      await Booking.syncDeleteFromVatsim(this.env, this.row.vatsimBookingId);
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bookings.id, this.row.id))
      .returning();

    this._row = updated;
    return updated;
  }

  async forfeit(): Promise<BookingRow> {
    if (this.row.status !== "active") {
      throw new Error("Only active bookings can be forfeited");
    }
    if (this.row.facility !== "live") {
      throw new Error("Only live network bookings can be forfeited");
    }
    if (this.row.checkedInAt != null) {
      throw new Error("Booking was already checked in and cannot be forfeited");
    }

    if (this.row.vatsimBookingId != null) {
      await Booking.syncDeleteFromVatsim(this.env, this.row.vatsimBookingId);
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ status: "forfeited", updatedAt: new Date() })
      .where(eq(bookings.id, this.row.id))
      .returning();

    this._row = updated;
    return updated;
  }

  /** Record that the booked controller has connected on the callsign. */
  async markCheckedIn(at = new Date()): Promise<BookingRow> {
    if (this.row.status !== "active") {
      return this.row;
    }
    if (this.row.checkedInAt != null) {
      return this.row;
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ checkedInAt: at, updatedAt: new Date() })
      .where(eq(bookings.id, this.row.id))
      .returning();

    this._row = updated;
    return updated;
  }
}
