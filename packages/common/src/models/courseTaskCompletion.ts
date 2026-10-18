import type { DB } from "../db";
import {
  Course,
  type CourseTask,
  describeCourseTask,
  isRosterPosition,
  parseSoloDurationDays,
} from "./training";
import { User } from "./user";
import { certifyControllerOnRoster, grantSoloEndorsement } from "./rosterAuthorization";
import { getSoloPresetByLevel } from "./soloPresets";
import { queueCourseTaskCompletionEmail } from "../notifications/courseTaskCompletion";

export type CompleteCourseTaskOptions = {
  /** Used for the "view in Vector" link in completion emails. Email is skipped when absent. */
  vectorUrl?: string | undefined;
};

/**
 * Completes a manually completed course task for a student, applying roster
 * certification / solo endorsement side effects and queueing the completion email.
 * Throws a plain Error with a user-facing message on failure.
 */
export async function completeCourseTaskForStudent(
  db: DB,
  task: CourseTask,
  cid: number,
  actionerCid: number,
  options: CompleteCourseTaskOptions,
): Promise<{ followUp: "certify" | "solo" | null }> {
  try {
    if (task.taskType === "certify") {
      const position = task.taskValue1?.trim() ?? "";
      if (!isRosterPosition(position)) {
        throw new Error("This certify task is missing a valid roster position");
      }
      await certifyControllerOnRoster(db, cid, position);
    } else if (task.taskType === "solo") {
      const level = task.taskValue1?.trim() ?? "";
      if (!isRosterPosition(level)) {
        throw new Error(
          "This solo task must use a preset level (Ground, Tower, Approach, or Centre). Re-save the task in course admin.",
        );
      }
      const preset = await getSoloPresetByLevel(db, level);
      if (!preset || preset.positions.length === 0) {
        throw new Error(
          `Solo preset for ${level} is empty. Configure positions under Solo Presets first.`,
        );
      }
      const durationDays = parseSoloDurationDays(task.taskValue2);
      await grantSoloEndorsement(
        db,
        cid,
        preset.positions.map((position) => position.callsign),
        durationDays,
      );
    }
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Failed to update roster or solo endorsement",
    );
  }

  await task.complete(cid);

  if (
    (task.taskType === "certify" || task.taskType === "solo") &&
    options.vectorUrl
  ) {
    try {
      const [course, student, instructor] = await Promise.all([
        Course.fetchById(task.courseId, db),
        User.fromCid(db, cid),
        User.fromCid(db, actionerCid),
      ]);
      if (course && student && instructor) {
        await queueCourseTaskCompletionEmail(db, {
          kind: task.taskType,
          courseId: task.courseId,
          courseName: course.name,
          student: { cid: student.cid, name_full: student.name_full },
          instructor: { cid: instructor.cid, name_full: instructor.name_full },
          summary: describeCourseTask(task),
          vectorUrl: options.vectorUrl,
        });
      }
    } catch (err) {
      console.error("Failed to queue training completion email", err);
    }
  }

  return {
    followUp:
      task.taskType === "certify" || task.taskType === "solo" ? task.taskType : null,
  };
}
