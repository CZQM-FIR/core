import type {
  BookingFacility,
  BookingPolicyKind,
  BookingVatsimType,
} from "@czqm/db/schema";
import { MonctonMondayWindow } from "./monctonMonday";
import type { User } from "../models/user";

export const MIN_BOOKING_ADVANCE_MS = 60 * 60 * 1000;
export const MIN_BOOKING_DURATION_MS = 45 * 60 * 1000;
export const MAX_BOOKING_DURATION_MS = 4 * 60 * 60 * 1000;
export const MONCTON_MONDAY_MAX_DURATION_MS = 2 * 60 * 60 * 1000;

export const BOOKED_TIME_WINDOW_MS = 24 * 60 * 60 * 1000;
export const CONTROLLER_MAX_BOOKED_MS_PER_WINDOW = 8 * 60 * 60 * 1000;

export type BookedInterval = {
  startsAt: Date;
  endsAt: Date;
};

export type BookingValidationRequest = {
  cid: number;
  callsign: string;
  startsAt: Date;
  endsAt: Date;
  facility: BookingFacility;
};

export type BookingPolicyIntent = {
  /** When true (or a training session is linked), use instructor/mentor booking rules. */
  linkedTraining?: boolean;
};

export abstract class BookingPolicy {
  abstract readonly kind: BookingPolicyKind;
  abstract readonly graceMinutes: number;
  abstract readonly allowedFacilities: readonly BookingFacility[];
  abstract readonly maxAdvanceMs: number;

  /** Max total booked time inside any rolling `bookedWindowMs`; null = unlimited. */
  readonly maxBookedMsPerWindow: number | null = null;
  readonly bookedWindowMs: number = BOOKED_TIME_WINDOW_MS;

  abstract vatsimTypeForLive(): BookingVatsimType;

  /**
   * Checks that adding `candidate` to the user's `existing` bookings never pushes
   * booked time above the limit in any rolling window that touches the candidate.
   */
  assertWithinBookedTimeLimit(
    existing: readonly BookedInterval[],
    candidate: BookedInterval,
  ): void {
    const max = this.maxBookedMsPerWindow;
    if (max == null) return;

    const windowMs = this.bookedWindowMs;
    const all = [...existing, candidate].map((i) => ({
      start: i.startsAt.getTime(),
      end: i.endsAt.getTime(),
    }));
    const candStart = candidate.startsAt.getTime();
    const candEnd = candidate.endsAt.getTime();

    // The booked total inside a sliding window peaks when the window starts at a
    // booking start or ends at a booking end, so only those need checking.
    const windowStarts = new Set<number>();
    for (const i of all) {
      windowStarts.add(i.start);
      windowStarts.add(i.end - windowMs);
    }

    for (const ws of windowStarts) {
      const we = ws + windowMs;
      if (ws >= candEnd || we <= candStart) continue;

      let total = 0;
      for (const i of all) {
        const overlap = Math.min(i.end, we) - Math.max(i.start, ws);
        if (overlap > 0) total += overlap;
      }
      if (total > max) {
        throw new Error(this.bookedTimeLimitErrorMessage());
      }
    }
  }

  protected bookedTimeLimitErrorMessage(): string {
    return "This booking exceeds the maximum booked time";
  }

  maxDurationMs(_start: Date, _end: Date): number {
    return MAX_BOOKING_DURATION_MS;
  }

  assertCanCreate(request: BookingValidationRequest, now: Date): void {
    if (request.endsAt.getTime() <= request.startsAt.getTime()) {
      throw new Error("Booking end time must be after the start time");
    }

    const advanceMs = request.startsAt.getTime() - now.getTime();
    if (advanceMs < MIN_BOOKING_ADVANCE_MS) {
      throw new Error("Bookings must be scheduled at least 1 hour in advance");
    }

    if (advanceMs > this.maxAdvanceMs) {
      throw new Error(this.maxAdvanceErrorMessage());
    }

    if (!this.allowedFacilities.includes(request.facility)) {
      throw new Error(this.facilityErrorMessage(request.facility));
    }

    const durationMs = request.endsAt.getTime() - request.startsAt.getTime();
    if (durationMs < MIN_BOOKING_DURATION_MS) {
      throw new Error("Bookings must be at least 45 minutes long");
    }
    const maxDuration = this.maxDurationMs(request.startsAt, request.endsAt);
    if (durationMs > maxDuration) {
      throw new Error(this.durationErrorMessage(maxDuration));
    }
  }

  protected maxAdvanceErrorMessage(): string {
    return "This booking is too far in the future";
  }

  protected facilityErrorMessage(facility: BookingFacility): string {
    return `Facility "${facility}" is not allowed for this booking`;
  }

  protected durationErrorMessage(maxDurationMs: number): string {
    const hours = maxDurationMs / (60 * 60 * 1000);
    return `Bookings cannot exceed ${hours} hours`;
  }
}

export class ControllerBookingPolicy extends BookingPolicy {
  readonly kind = "controller" as const;
  readonly graceMinutes = 10;
  readonly allowedFacilities = ["live"] as const;
  readonly maxAdvanceMs = 3 * 24 * 60 * 60 * 1000;
  readonly maxBookedMsPerWindow: number | null =
    CONTROLLER_MAX_BOOKED_MS_PER_WINDOW;

  vatsimTypeForLive(): BookingVatsimType {
    return "booking";
  }

  protected bookedTimeLimitErrorMessage(): string {
    const hours = CONTROLLER_MAX_BOOKED_MS_PER_WINDOW / (60 * 60 * 1000);
    return `You can book at most ${hours} hours in any rolling 24-hour period`;
  }

  maxDurationMs(start: Date, end: Date): number {
    if (MonctonMondayWindow.overlaps(start, end)) {
      return MONCTON_MONDAY_MAX_DURATION_MS;
    }
    return MAX_BOOKING_DURATION_MS;
  }

  protected maxAdvanceErrorMessage(): string {
    return "Controller bookings cannot be more than 3 days in advance";
  }

  protected durationErrorMessage(maxDurationMs: number): string {
    if (maxDurationMs === MONCTON_MONDAY_MAX_DURATION_MS) {
      return "Bookings overlapping Moncton Monday cannot exceed 2 hours";
    }
    return super.durationErrorMessage(maxDurationMs);
  }
}

export class InstructorMentorBookingPolicy extends BookingPolicy {
  readonly kind = "instructor" as const;
  readonly graceMinutes = 15;
  readonly allowedFacilities = ["live", "sweatbox", "sweatbox2"] as const;
  readonly maxAdvanceMs = 14 * 24 * 60 * 60 * 1000;

  vatsimTypeForLive(): BookingVatsimType {
    return "training";
  }

  protected maxAdvanceErrorMessage(): string {
    return "Instructor and mentor bookings cannot be more than 14 days in advance";
  }
}

export class BookingPolicyFactory {
  /**
   * Instructor/mentor rules apply only for training-linked bookings.
   * Self-bookings (web) always use controller rules, including for instructors/mentors.
   */
  static forActor(
    user: User,
    intent: BookingPolicyIntent = {},
  ): BookingPolicy {
    const forTraining = intent.linkedTraining === true;

    if (
      forTraining &&
      user.hasFlag(["instructor", "mentor", "chief-instructor"])
    ) {
      return new InstructorMentorBookingPolicy();
    }

    if (
      user.hasFlag([
        "controller",
        "visitor",
        "instructor",
        "mentor",
        "chief-instructor",
      ])
    ) {
      return new ControllerBookingPolicy();
    }

    throw new Error("Only controllers and visitors can book positions");
  }
}

export function resolveBookingVatsimType(
  policy: BookingPolicy,
  facility: BookingFacility,
): BookingVatsimType {
  if (facility !== "live") {
    return "booking";
  }
  return policy.vatsimTypeForLive();
}

export function policyForKind(kind: BookingPolicyKind): BookingPolicy {
  if (kind === "instructor") {
    return new InstructorMentorBookingPolicy();
  }
  return new ControllerBookingPolicy();
}
