import {
  trainingSessions,
  type TrainingSessionObjectiveResult,
  type TrainingSessionRow,
} from "@czqm/db/schema";
import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import type { DB } from "../db";
import { User } from "./user";

export const TRAINING_SESSION_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "in_progress",
  "completed",
] as const;

export type TrainingSessionStatus = (typeof TRAINING_SESSION_STATUSES)[number];

/** Statuses that always block another booking for the same task. */
export const ACTIVE_STATUSES: TrainingSessionStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
];

export const NOTES_UNSUBMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const INSTRUCTOR_NOTES_MIN_LENGTH = 3;
export const INSTRUCTOR_NOTES_MAX_LENGTH = 5000;
export const POSITION_TRAINED_MAX_LENGTH = 10;

export type { TrainingSessionObjectiveResult };

export type TrainingSessionSummary = {
  id: number;
  startsAt: Date;
  endsAt: Date;
  status: TrainingSessionStatus;
  scheduledByCid: number;
  trainingNote: string | null;
  scheduledByName?: string;
  scheduledByRole?: string;
};

type TaskLookup = {
  studentCid: number;
  courseId: string;
  taskId: number;
};

type CreatePendingInput = TaskLookup & {
  scheduledByCid: number;
  startsAt: Date;
  endsAt: Date;
  trainingNote?: string | null;
};

type SaveNotesInput = {
  instructorNotes?: string | null;
  positionTrained?: string | null;
  objectiveResults?: TrainingSessionObjectiveResult[] | null;
};

export function alignObjectiveResults(
  objectives: string[],
  existing: TrainingSessionObjectiveResult[] | null | undefined,
): TrainingSessionObjectiveResult[] {
  const achievedByText = new Map<string, boolean>();
  for (const result of existing ?? []) {
    const text = result.text.trim();
    if (!text || achievedByText.has(text)) continue;
    achievedByText.set(text, result.achieved === true);
  }

  return objectives.map((text) => ({
    text,
    achieved: achievedByText.get(text) ?? false,
  }));
}

export function allObjectivesAchieved(
  results: TrainingSessionObjectiveResult[],
): boolean {
  return results.length > 0 && results.every((result) => result.achieved);
}

function assertScheduler(row: TrainingSessionRow, actorCid: number): void {
  if (row.scheduledByCid !== actorCid) {
    throw new Error("Only the person who scheduled this session can manage it");
  }
}

function normalizeInstructorNotes(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > INSTRUCTOR_NOTES_MAX_LENGTH) {
    throw new Error(
      `Instructor notes must be ${INSTRUCTOR_NOTES_MAX_LENGTH} characters or fewer`,
    );
  }
  return value;
}

function normalizePositionTrained(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > POSITION_TRAINED_MAX_LENGTH) {
    throw new Error(
      `Position must be ${POSITION_TRAINED_MAX_LENGTH} characters or fewer`,
    );
  }
  return trimmed;
}

export function notesUnsubmitDeadline(notesSubmittedAt: Date): Date {
  return new Date(notesSubmittedAt.getTime() + NOTES_UNSUBMIT_WINDOW_MS);
}

export function canUnsubmitTrainingSessionNotes(
  notesSubmittedAt: Date | null,
  now = new Date(),
): boolean {
  if (!notesSubmittedAt) return false;
  return now.getTime() < notesUnsubmitDeadline(notesSubmittedAt).getTime();
}

export function trainingNotesSentToVatcan(row: {
  notesSubmittedAt: Date | null;
  vatcanNoteId: number | null;
}): boolean {
  return row.notesSubmittedAt != null || row.vatcanNoteId != null;
}

export function canSubmitTrainingNotesToVatcan(
  status: TrainingSessionStatus,
): boolean {
  return status === "completed";
}

export function canCancelTrainingSession(
  status: TrainingSessionStatus,
  actor: "student" | "scheduler",
  notesSentToVatcan: boolean,
): boolean {
  if (notesSentToVatcan) return false;
  if (actor === "student") {
    return status === "pending" || status === "confirmed";
  }
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "in_progress" ||
    status === "completed"
  );
}

/** Unsubmitted pending, confirmed, in-progress, and completed sessions can be transferred. */
export function canTransferTrainingSession(
  status: TrainingSessionStatus,
  notesSentToVatcan: boolean,
): boolean {
  if (notesSentToVatcan) return false;
  return (
    status === "pending" ||
    status === "confirmed" ||
    status === "in_progress" ||
    status === "completed"
  );
}

export function validateSubmittedInstructorNotes(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length < INSTRUCTOR_NOTES_MIN_LENGTH ||
    trimmed.length > INSTRUCTOR_NOTES_MAX_LENGTH
  ) {
    throw new Error(
      `Training note must be between ${INSTRUCTOR_NOTES_MIN_LENGTH} and ${INSTRUCTOR_NOTES_MAX_LENGTH} characters`,
    );
  }
  return trimmed;
}

export function validateSubmittedPositionTrained(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Position trained is required");
  }
  if (trimmed.length > POSITION_TRAINED_MAX_LENGTH) {
    throw new Error(
      `Position must be ${POSITION_TRAINED_MAX_LENGTH} characters or fewer`,
    );
  }
  return trimmed;
}

/** pending, confirmed, in_progress, and completed-but-unsubmitted block another booking. */
export function trainingSessionBlocksBookingSql() {
  return or(
    inArray(trainingSessions.status, ACTIVE_STATUSES),
    and(
      eq(trainingSessions.status, "completed"),
      isNull(trainingSessions.notesSubmittedAt),
    ),
  );
}

export class TrainingSession {
  static toSummary(row: TrainingSessionRow): TrainingSessionSummary {
    return {
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status as TrainingSessionStatus,
      scheduledByCid: row.scheduledByCid,
      trainingNote: row.trainingNote,
    };
  }

  static schedulerRoleLabel(user: User): string {
    if (user.hasFlag("chief-instructor")) return "Chief Instructor";
    if (user.hasFlag("instructor")) return "Instructor";
    if (user.hasFlag("mentor")) return "Mentor";
    return "Staff";
  }

  static async enrichWithScheduler(
    db: DB,
    summary: TrainingSessionSummary,
  ): Promise<TrainingSessionSummary> {
    const scheduler = await User.fromCid(db, summary.scheduledByCid);
    if (!scheduler) return summary;

    return {
      ...summary,
      scheduledByName: scheduler.displayName,
      scheduledByRole: TrainingSession.schedulerRoleLabel(scheduler),
    };
  }

  static async fetchById(
    db: DB,
    sessionId: number,
  ): Promise<TrainingSessionRow | null> {
    const [row] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.id, sessionId))
      .limit(1);

    return row ?? null;
  }

  static async fetchActiveForTask(
    db: DB,
    { studentCid, courseId, taskId }: TaskLookup,
  ): Promise<TrainingSessionRow | null> {
    const [row] = await db
      .select()
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.studentCid, studentCid),
          eq(trainingSessions.courseId, courseId),
          eq(trainingSessions.taskId, taskId),
          trainingSessionBlocksBookingSql(),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  static async fetchActiveForUser(
    db: DB,
    cid: number,
  ): Promise<TrainingSessionRow[]> {
    return db
      .select()
      .from(trainingSessions)
      .where(
        and(
          trainingSessionBlocksBookingSql(),
          or(
            eq(trainingSessions.studentCid, cid),
            eq(trainingSessions.scheduledByCid, cid),
          ),
        ),
      )
      .orderBy(trainingSessions.startsAt);
  }

  /** pending, confirmed, and in_progress sessions that overlap a time window. */
  static async fetchScheduledInWindow(
    db: DB,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<TrainingSessionRow[]> {
    return db
      .select()
      .from(trainingSessions)
      .where(
        and(
          inArray(trainingSessions.status, ACTIVE_STATUSES),
          lt(trainingSessions.startsAt, windowEnd),
          gt(trainingSessions.endsAt, windowStart),
        ),
      )
      .orderBy(trainingSessions.startsAt);
  }

  static async createPending(
    db: DB,
    input: CreatePendingInput,
  ): Promise<TrainingSessionRow> {
    const existing = await TrainingSession.fetchActiveForTask(db, input);
    if (existing) {
      throw new Error(
        "An active training session already exists for this task",
      );
    }

    const now = new Date();
    const [row] = await db
      .insert(trainingSessions)
      .values({
        studentCid: input.studentCid,
        courseId: input.courseId,
        taskId: input.taskId,
        scheduledByCid: input.scheduledByCid,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: "pending",
        trainingNote: input.trainingNote ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return row;
  }

  static async confirm(
    db: DB,
    sessionId: number,
    studentCid: number,
  ): Promise<TrainingSessionRow> {
    const [row] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.id, sessionId))
      .limit(1);

    if (!row) throw new Error("Training session not found");
    if (row.studentCid !== studentCid) {
      throw new Error("Training session does not belong to this student");
    }
    if (row.status !== "pending") {
      throw new Error("Only pending training sessions can be confirmed");
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async decline(
    db: DB,
    sessionId: number,
    studentCid: number,
  ): Promise<TrainingSessionRow> {
    const [row] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.id, sessionId))
      .limit(1);

    if (!row) throw new Error("Training session not found");
    if (row.studentCid !== studentCid) {
      throw new Error("Training session does not belong to this student");
    }
    if (row.status !== "pending") {
      throw new Error("Only pending training sessions can be declined");
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async cancel(
    db: DB,
    sessionId: number,
    actorCid: number,
  ): Promise<TrainingSessionRow> {
    const [row] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.id, sessionId))
      .limit(1);

    if (!row) throw new Error("Training session not found");
    if (row.studentCid !== actorCid && row.scheduledByCid !== actorCid) {
      throw new Error(
        "Only the student or the person who scheduled this session can cancel it",
      );
    }
    if (trainingNotesSentToVatcan(row)) {
      throw new Error(
        "Sessions with training notes submitted to VATCAN cannot be cancelled",
      );
    }
    const actor = row.scheduledByCid === actorCid ? "scheduler" : "student";
    if (
      !canCancelTrainingSession(
        row.status as TrainingSessionStatus,
        actor,
        false,
      )
    ) {
      throw new Error(
        actor === "scheduler"
          ? "This training session cannot be cancelled"
          : "Only pending or confirmed training sessions can be cancelled",
      );
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async start(
    db: DB,
    sessionId: number,
    actorCid: number,
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (row.status !== "confirmed") {
      throw new Error("Only confirmed training sessions can be started");
    }

    const now = new Date();
    const [updated] = await db
      .update(trainingSessions)
      .set({
        status: "in_progress",
        actualStartedAt: now,
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async end(
    db: DB,
    sessionId: number,
    actorCid: number,
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (row.status !== "in_progress") {
      throw new Error("Only in-progress training sessions can be ended");
    }

    const now = new Date();
    const [updated] = await db
      .update(trainingSessions)
      .set({
        status: "completed",
        actualEndedAt: now,
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async transfer(
    db: DB,
    sessionId: number,
    toCid: number,
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    if (trainingNotesSentToVatcan(row)) {
      throw new Error(
        "Sessions with training notes submitted to VATCAN cannot be transferred",
      );
    }
    if (
      !canTransferTrainingSession(row.status as TrainingSessionStatus, false)
    ) {
      throw new Error("This training session cannot be transferred");
    }
    if (toCid === row.scheduledByCid) {
      throw new Error(
        "This training session is already assigned to that instructor",
      );
    }
    if (toCid === row.studentCid) {
      throw new Error(
        "A training session cannot be transferred to the student",
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(trainingSessions)
      .set({
        scheduledByCid: toCid,
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async reschedule(
    db: DB,
    sessionId: number,
    actorCid: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (row.status !== "pending" && row.status !== "confirmed") {
      throw new Error(
        "Only pending or confirmed training sessions can be rescheduled",
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(trainingSessions)
      .set({
        startsAt,
        endsAt,
        status: "pending",
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async saveNotes(
    db: DB,
    sessionId: number,
    actorCid: number,
    input: SaveNotesInput,
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (row.status === "cancelled" || row.status === "declined") {
      throw new Error("Cannot edit training notes for a cancelled session");
    }
    if (row.notesSubmittedAt) {
      throw new Error("Training notes are locked and cannot be edited");
    }

    const now = new Date();
    const [updated] = await db
      .update(trainingSessions)
      .set({
        instructorNotes: normalizeInstructorNotes(input.instructorNotes),
        positionTrained: normalizePositionTrained(input.positionTrained),
        ...(input.objectiveResults !== undefined
          ? { objectiveResults: input.objectiveResults }
          : {}),
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async submitNotes(
    db: DB,
    sessionId: number,
    actorCid: number,
    vatcanNoteId: number,
    submittedAt = new Date(),
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (row.status === "cancelled" || row.status === "declined") {
      throw new Error(
        "Cancelled sessions cannot have training notes submitted to VATCAN",
      );
    }
    if (!canSubmitTrainingNotesToVatcan(row.status as TrainingSessionStatus)) {
      throw new Error(
        "Notes can only be submitted after the session has ended",
      );
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({
        vatcanNoteId,
        notesSubmittedAt: submittedAt,
        updatedAt: new Date(),
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async unsubmitNotes(
    db: DB,
    sessionId: number,
    actorCid: number,
    now = new Date(),
  ): Promise<TrainingSessionRow> {
    const row = await TrainingSession.fetchById(db, sessionId);
    if (!row) throw new Error("Training session not found");
    assertScheduler(row, actorCid);
    if (!row.notesSubmittedAt) {
      throw new Error("Training notes are not submitted");
    }
    if (!canUnsubmitTrainingSessionNotes(row.notesSubmittedAt, now)) {
      throw new Error(
        "Training notes can only be unsubmitted within 24 hours of submission",
      );
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({
        notesSubmittedAt: null,
        updatedAt: now,
      })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }
}
