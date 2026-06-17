import { trainingSessions, type TrainingSessionRow } from "@czqm/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../db";
import { User } from "./user";

export const TRAINING_SESSION_STATUSES = [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
] as const;

export type TrainingSessionStatus = (typeof TRAINING_SESSION_STATUSES)[number];

export const ACTIVE_STATUSES: TrainingSessionStatus[] = ["pending", "confirmed"];

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
          inArray(trainingSessions.status, ACTIVE_STATUSES),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  static async createPending(
    db: DB,
    input: CreatePendingInput,
  ): Promise<TrainingSessionRow> {
    const existing = await TrainingSession.fetchActiveForTask(db, input);
    if (existing) {
      throw new Error("An active training session already exists for this task");
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
    if (row.status !== "pending" && row.status !== "confirmed") {
      throw new Error("Only pending or confirmed training sessions can be cancelled");
    }

    const [updated] = await db
      .update(trainingSessions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(trainingSessions.id, sessionId))
      .returning();

    return updated;
  }
}
