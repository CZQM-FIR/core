import type { DB } from "../db";
import * as schema from "@czqm/db/schema";
import { and, eq } from "drizzle-orm";
import type { Env } from "../types";
import type { User } from "./user";

type PrerequisiteRow = {
  prerequisiteId: number;
  prerequisiteType: string;
  prerequisiteValue1: string | null;
  prerequisiteValue2: string | null;
};

export type CoursePrerequisiteEvaluationResult = {
  satisfied: boolean;
  failures: string[];
  results: { description: string; met: boolean }[];
};

export class Course {
  id: string;
  name: string;
  description: string | null;
  waitlist: Waitlist;
  tasks: CourseTask[];
  prerequisites: CoursePrerequisite[];
  db: DB;

  private constructor(
    id: string,
    name: string,
    description: string | null,
    waitlist: Waitlist,
    tasks: CourseTask[],
    prerequisites: CoursePrerequisite[],
    db: DB,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.waitlist = waitlist;
    this.tasks = tasks;
    this.prerequisites = prerequisites;
    this.db = db;
  }

  static async fetchById(id: string, db: DB): Promise<Course | null> {
    const course = await db.query.courses.findFirst({
      where: {
        id: id,
      },
      with: {
        waitlist: true,
      },
    });

    if (!course) {
      return null;
    }

    if (!course.waitlist) {
      return null;
    }

    const waitlist = Waitlist.fromDBRow(course.waitlist, db);

    const tasks = course.tasks.map((task) =>
      CourseTask.fromRow(db, task, course.id),
    );

    const prerequisites = (course.prerequisites ?? []).map((prerequisite) =>
      CoursePrerequisite.fromRow(db, prerequisite, course.id),
    );

    return new Course(
      course.id,
      course.name,
      course.description,
      waitlist,
      tasks,
      prerequisites,
      db,
    );
  }

  static async fetchByWaitlistId(
    waitlistId: number,
    db: DB,
  ): Promise<Course | null> {
    const course = await db.query.courses.findFirst({
      where: {
        waitlistId,
      },
      with: {
        waitlist: true,
      },
    });

    if (!course) {
      return null;
    }

    if (!course.waitlist) {
      return null;
    }

    const waitlist = Waitlist.fromDBRow(course.waitlist, db);

    const tasks = course.tasks.map((task) =>
      CourseTask.fromRow(db, task, course.id),
    );

    const prerequisites = (course.prerequisites ?? []).map((prerequisite) =>
      CoursePrerequisite.fromRow(db, prerequisite, course.id),
    );

    return new Course(
      course.id,
      course.name,
      course.description,
      waitlist,
      tasks,
      prerequisites,
      db,
    );
  }

  static async create(
    db: DB,
    data: { name: string; description?: string | null },
  ): Promise<Course> {
    const [waitlist] = await db
      .insert(schema.waitlists)
      .values({ name: data.name })
      .returning({ id: schema.waitlists.id });

    const [course] = await db
      .insert(schema.courses)
      .values({
        name: data.name,
        description: data.description ?? null,
        waitlistId: waitlist.id,
      })
      .returning({ id: schema.courses.id });

    const created = await Course.fetchById(course.id, db);

    if (!created) {
      throw new Error("Failed to create course");
    }

    return created;
  }

  async graduateUser(userId: number): Promise<void> {
    const waitlistId = this.waitlist.id;

    const enrolled = await this.db.query.enrolledUsers.findFirst({
      where: { waitlistId, cid: userId, hiddenAt: { isNull: true } },
    });

    const alreadyCompleted = await this.db.query.completedUsers.findFirst({
      where: { waitlistId, cid: userId },
    });

    if (!enrolled) {
      if (alreadyCompleted) {
        throw new Error(
          `User ${userId} already graduated from waitlist ${waitlistId}`,
        );
      }
      throw new Error(
        `User ${userId} is not enrolled in waitlist ${waitlistId}`,
      );
    }

    await this.db.insert(schema.completedUsers).values({
      cid: userId,
      waitlistId,
      completedAt: new Date(),
    });

    await this.db
      .delete(schema.enrolledUsers)
      .where(
        and(
          eq(schema.enrolledUsers.waitlistId, waitlistId),
          eq(schema.enrolledUsers.cid, userId),
        ),
      );
  }

  async removeUserCompletion(userId: number): Promise<void> {
    const waitlistId = this.waitlist.id;

    const completed = await this.db.query.completedUsers.findFirst({
      where: { waitlistId, cid: userId },
    });

    if (!completed) {
      throw new Error(
        `User ${userId} has not completed waitlist ${waitlistId}`,
      );
    }

    await this.db
      .delete(schema.courseTaskCompletions)
      .where(
        and(
          eq(schema.courseTaskCompletions.courseId, this.id),
          eq(schema.courseTaskCompletions.userId, userId),
        ),
      );

    await this.db
      .delete(schema.completedUsers)
      .where(
        and(
          eq(schema.completedUsers.waitlistId, waitlistId),
          eq(schema.completedUsers.cid, userId),
        ),
      );
  }

  async graduateIfComplete(
    userId: number,
    env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    if (!(await this.isComplete(userId, env))) {
      return false;
    }
    await this.graduateUser(userId);
    return true;
  }

  async delete(): Promise<void> {
    // A course and its waitlist are a 1:1 unit. Deleting the waitlist cascades
    // (onDelete) to remove this course row and its enrolled students.
    await this.db
      .delete(schema.waitlists)
      .where(eq(schema.waitlists.id, this.waitlist.id));
  }

  async setDescription(description: string | null): Promise<Course> {
    await this.db
      .update(schema.courses)
      .set({ description })
      .where(eq(schema.courses.id, this.id));
    this.description = description;
    return this;
  }

  async setName(name: string): Promise<Course> {
    await this.db
      .update(schema.courses)
      .set({ name })
      .where(eq(schema.courses.id, this.id));
    await this.db
      .update(schema.waitlists)
      .set({ name })
      .where(eq(schema.waitlists.id, this.waitlist.id));
    this.name = name;
    this.waitlist.name = name;
    return this;
  }

  async setTasks(tasks: CourseTask[]): Promise<Course> {
    await this.db
      .update(schema.courses)
      .set({
        tasks: tasks.map((task) => ({
          taskId: task.taskId,
          taskType: task.taskType,
          taskValue1: task.taskValue1,
          taskValue2: task.taskValue2,
        })),
      })
      .where(eq(schema.courses.id, this.id));

    this.tasks = tasks;
    return this;
  }

  async createTask(
    taskType: TaskType,
    taskValue1: string | null = null,
    taskValue2: string | null = null,
  ): Promise<CourseTask> {
    const taskId =
      this.tasks.reduce((max, task) => Math.max(max, task.taskId), 0) + 1;

    const task = CourseTask.fromRow(
      this.db,
      { taskId, taskType, taskValue1, taskValue2 },
      this.id,
    );

    await this.setTasks([...this.tasks, task]);

    return task;
  }

  async updateTask(
    taskId: number,
    taskType: TaskType,
    taskValue1: string | null = null,
    taskValue2: string | null = null,
  ): Promise<CourseTask> {
    const index = this.tasks.findIndex((task) => task.taskId === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found on course ${this.id}`);
    }

    const task = CourseTask.fromRow(
      this.db,
      { taskId, taskType, taskValue1, taskValue2 },
      this.id,
    );

    const tasks = [...this.tasks];
    tasks[index] = task;
    await this.setTasks(tasks);

    return task;
  }

  async deleteTask(taskId: number): Promise<void> {
    const index = this.tasks.findIndex((task) => task.taskId === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found on course ${this.id}`);
    }

    await this.db
      .delete(schema.courseTaskCompletions)
      .where(
        and(
          eq(schema.courseTaskCompletions.courseId, this.id),
          eq(schema.courseTaskCompletions.taskId, taskId),
        ),
      );

    const tasks = this.tasks.filter((task) => task.taskId !== taskId);
    await this.setTasks(tasks);
  }

  async moveTaskUp(taskId: number): Promise<void> {
    const index = this.tasks.findIndex((task) => task.taskId === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found on course ${this.id}`);
    }
    if (index === 0) {
      throw new Error(`Task ${taskId} is already at the top`);
    }

    const tasks = [...this.tasks];
    [tasks[index - 1], tasks[index]] = [tasks[index], tasks[index - 1]];
    await this.setTasks(tasks);
  }

  async moveTaskDown(taskId: number): Promise<void> {
    const index = this.tasks.findIndex((task) => task.taskId === taskId);
    if (index === -1) {
      throw new Error(`Task ${taskId} not found on course ${this.id}`);
    }
    if (index === this.tasks.length - 1) {
      throw new Error(`Task ${taskId} is already at the bottom`);
    }

    const tasks = [...this.tasks];
    [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
    await this.setTasks(tasks);
  }

  async setPrerequisites(
    prerequisites: CoursePrerequisite[],
  ): Promise<Course> {
    const rows = prerequisites.map((prerequisite) => ({
      prerequisiteId: prerequisite.prerequisiteId,
      prerequisiteType: prerequisite.prerequisiteType,
      prerequisiteValue1: prerequisite.prerequisiteValue1,
      prerequisiteValue2: prerequisite.prerequisiteValue2,
    }));

    await this.db
      .update(schema.courses)
      .set({ prerequisites: rows })
      .where(eq(schema.courses.id, this.id));

    this.prerequisites = rows.map((row) =>
      CoursePrerequisite.fromRow(this.db, row, this.id),
    );
    return this;
  }

  async createPrerequisite(
    prerequisiteType: PrerequisiteType,
    prerequisiteValue1: string | null = null,
    prerequisiteValue2: string | null = null,
  ): Promise<CoursePrerequisite> {
    const prerequisiteId =
      this.prerequisites.reduce(
        (max, prerequisite) => Math.max(max, prerequisite.prerequisiteId),
        0,
      ) + 1;

    const prerequisite = CoursePrerequisite.fromRow(
      this.db,
      {
        prerequisiteId,
        prerequisiteType,
        prerequisiteValue1,
        prerequisiteValue2,
      },
      this.id,
    );

    await this.setPrerequisites([...this.prerequisites, prerequisite]);

    return prerequisite;
  }

  async updatePrerequisite(
    prerequisiteId: number,
    prerequisiteType: PrerequisiteType,
    prerequisiteValue1: string | null = null,
    prerequisiteValue2: string | null = null,
  ): Promise<CoursePrerequisite> {
    const index = this.prerequisites.findIndex(
      (prerequisite) => prerequisite.prerequisiteId === prerequisiteId,
    );
    if (index === -1) {
      throw new Error(
        `Prerequisite ${prerequisiteId} not found on course ${this.id}`,
      );
    }

    const prerequisite = CoursePrerequisite.fromRow(
      this.db,
      {
        prerequisiteId,
        prerequisiteType,
        prerequisiteValue1,
        prerequisiteValue2,
      },
      this.id,
    );

    const prerequisites = [...this.prerequisites];
    prerequisites[index] = prerequisite;
    await this.setPrerequisites(prerequisites);

    return prerequisite;
  }

  async deletePrerequisite(prerequisiteId: number): Promise<void> {
    const index = this.prerequisites.findIndex(
      (prerequisite) => prerequisite.prerequisiteId === prerequisiteId,
    );
    if (index === -1) {
      throw new Error(
        `Prerequisite ${prerequisiteId} not found on course ${this.id}`,
      );
    }

    const prerequisites = this.prerequisites.filter(
      (prerequisite) => prerequisite.prerequisiteId !== prerequisiteId,
    );
    await this.setPrerequisites(prerequisites);
  }

  async evaluatePrerequisites(
    user: User,
  ): Promise<CoursePrerequisiteEvaluationResult> {
    if (this.prerequisites.length === 0) {
      return { satisfied: true, failures: [], results: [] };
    }

    const evaluated = await Promise.all(
      this.prerequisites.map(async (prerequisite) => ({
        description: describeCoursePrerequisite(prerequisite),
        met: await prerequisite.isMet(user),
      })),
    );

    const failures = evaluated
      .filter((result) => !result.met)
      .map((result) => result.description);

    return {
      satisfied: failures.length === 0,
      failures,
      results: evaluated,
    };
  }

  async isComplete(
    userId: number,
    env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    if (this.tasks.length === 0) return true;

    const results = await Promise.all(
      this.tasks.map((task) => task.isCompleted(userId, env)),
    );

    return results.every(Boolean);
  }
}

export class Waitlist {
  id: number;
  name: string;
  waitTime: string | null;
  waitlistCohort: string | null;
  enrolledCohort: string | null;
  db: DB;

  private constructor(
    id: number,
    name: string,
    waitTime: string | null,
    waitlistCohort: string | null,
    enrolledCohort: string | null,
    db: DB,
  ) {
    this.id = id;
    this.name = name;
    this.waitTime = waitTime;
    this.waitlistCohort = waitlistCohort;
    this.enrolledCohort = enrolledCohort;
    this.db = db;
  }

  static fromDBRow(row: schema.Waitlist, db: DB): Waitlist {
    return new Waitlist(
      row.id,
      row.name,
      row.waitTime,
      row.waitlistCohort,
      row.enrolledCohort,
      db,
    );
  }
}

export type TaskType =
  | "moodle"
  | "vatcan_cbt"
  | "vatcan_exam"
  | "training_session"
  | "delay"
  | "manual";

export const COURSE_TASK_TYPE_LABELS: Record<TaskType, string> = {
  manual: "Manual",
  vatcan_exam: "VATCAN Exam",
  moodle: "Moodle",
  vatcan_cbt: "VATCAN CBT",
  training_session: "Training Session",
  delay: "Delay",
};

export function formatCourseTaskType(taskType: string): string {
  return COURSE_TASK_TYPE_LABELS[taskType as TaskType] ?? taskType;
}

export const TRAINING_SESSION_TYPE_LABELS = {
  monitoring: "Monitoring",
  sweatbox: "Sweatbox",
  orientation: "Orientation",
  ots: "OTS",
  generic: "Generic",
} as const;

export type TrainingSessionType = keyof typeof TRAINING_SESSION_TYPE_LABELS;

export function formatTrainingSessionType(value: string): string {
  return TRAINING_SESSION_TYPE_LABELS[value as TrainingSessionType] ?? value;
}

export function isTrainingSessionType(
  value: string,
): value is TrainingSessionType {
  return value in TRAINING_SESSION_TYPE_LABELS;
}

function indefiniteArticle(word: string): "a" | "an" {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function describeTrainingSessionTask(
  taskValue1: string | null,
  taskValue2: string | null,
): string {
  if (!taskValue1) {
    return "Complete a training session";
  }

  const label = formatTrainingSessionType(taskValue1);
  const base = `Complete ${indefiniteArticle(label)} ${label} session`;
  return taskValue2 ? `${base}: ${taskValue2}` : base;
}

export function describeCourseTask(task: {
  taskType: string;
  taskValue1: string | null;
  taskValue2: string | null;
}): string {
  switch (task.taskType) {
    case "manual":
      return task.taskValue1 ?? "Manual task";
    case "vatcan_exam":
      return `Complete the ${task.taskValue1 ?? "VATCAN"} exam`;
    case "moodle":
      return `Complete the Moodle course "${task.taskValue1 ?? "Unknown"}"`;
    case "vatcan_cbt": {
      const blockId = task.taskValue1 ? Number(task.taskValue1) : null;
      const display =
        blockId !== null && Number.isFinite(blockId) ? blockId : "Unknown";
      return `Complete VATCAN CBT block ${display}`;
    }
    case "training_session":
      return describeTrainingSessionTask(task.taskValue1, task.taskValue2);
    case "delay": {
      const unit = task.taskValue1 === "hours" ? "hours" : "days";
      const amount = Number(task.taskValue2 ?? 0);
      return unit === "hours"
        ? `Wait ${amount} controlling hour(s)`
        : `Wait ${amount} day(s)`;
    }
    default:
      return "Unknown task";
  }
}

export type PrerequisiteType =
  | "minimum_rating"
  | "controlling_hours"
  | "prior_course"
  | "earliest_enroll_date"
  | "home_controller"
  | "visiting_controller"
  | "home_or_visiting_controller";

export const COURSE_PREREQUISITE_TYPE_LABELS: Record<PrerequisiteType, string> =
  {
    minimum_rating: "Minimum Rating",
    controlling_hours: "Controlling Hours",
    prior_course: "Prior Course",
    earliest_enroll_date: "Earliest Enroll Date",
    home_controller: "Must Be Home Controller",
    visiting_controller: "Must Be Visiting Controller",
    home_or_visiting_controller: "Must Be Home or Visiting Controller",
  };

export function formatCoursePrerequisiteType(
  prerequisiteType: string,
): string {
  return (
    COURSE_PREREQUISITE_TYPE_LABELS[prerequisiteType as PrerequisiteType] ??
    prerequisiteType
  );
}

export function describeCoursePrerequisite(prerequisite: {
  prerequisiteType: string;
  prerequisiteValue1: string | null;
  prerequisiteValue2: string | null;
}): string {
  switch (prerequisite.prerequisiteType) {
    case "minimum_rating":
      return `Minimum rating ${prerequisite.prerequisiteValue1 ?? "unknown"} or higher`;
    case "controlling_hours":
      return `${prerequisite.prerequisiteValue1 ?? "0"} controlling hour(s) at rating ${prerequisite.prerequisiteValue2 ?? "unknown"} or above`;
    case "prior_course":
      return `Completed course ${prerequisite.prerequisiteValue1 ?? "unknown"}`;
    case "earliest_enroll_date":
      return `Enrollment available from ${prerequisite.prerequisiteValue1 ?? "unknown"}`;
    case "home_controller":
      return "Must be a home controller";
    case "visiting_controller":
      return "Must be a visiting controller";
    case "home_or_visiting_controller":
      return "Must be a home or visiting controller";
    default:
      return "Unknown prerequisite";
  }
}

export abstract class CoursePrerequisite {
  db: DB;
  prerequisiteType: PrerequisiteType;
  prerequisiteValue1: string | null;
  prerequisiteValue2: string | null;
  courseId: string;
  prerequisiteId: number;

  protected constructor(
    db: DB,
    prerequisiteType: PrerequisiteType,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    this.db = db;
    this.prerequisiteType = prerequisiteType;
    this.prerequisiteValue1 = prerequisiteValue1;
    this.prerequisiteValue2 = prerequisiteValue2;
    this.courseId = courseId;
    this.prerequisiteId = prerequisiteId;
  }

  static fromRow(
    db: DB,
    row: PrerequisiteRow,
    courseId: string,
  ): CoursePrerequisite {
    const args = [
      db,
      row.prerequisiteValue1,
      row.prerequisiteValue2,
      courseId,
      row.prerequisiteId,
    ] as const;

    switch (row.prerequisiteType) {
      case "minimum_rating":
        return new MinimumRatingCoursePrerequisite(...args);
      case "controlling_hours":
        return new ControllingHoursCoursePrerequisite(...args);
      case "prior_course":
        return new PriorCourseCoursePrerequisite(...args);
      case "earliest_enroll_date":
        return new EarliestEnrollDateCoursePrerequisite(...args);
      case "home_controller":
        return new HomeControllerCoursePrerequisite(...args);
      case "visiting_controller":
        return new VisitingControllerCoursePrerequisite(...args);
      case "home_or_visiting_controller":
        return new HomeOrVisitingControllerCoursePrerequisite(...args);
      default:
        throw new Error(`Unknown prerequisite type: ${row.prerequisiteType}`);
    }
  }

  abstract isMet(user: User): boolean | Promise<boolean>;

  getDescription(): string {
    return describeCoursePrerequisite(this);
  }
}

export class MinimumRatingCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "minimum_rating",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(user: User): boolean {
    const requiredRatingId = Number(this.prerequisiteValue1);
    if (!Number.isFinite(requiredRatingId)) {
      return false;
    }
    return user.rating.id >= requiredRatingId;
  }
}

export class ControllingHoursCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "controlling_hours",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(user: User): boolean {
    const requiredHours = Number(this.prerequisiteValue1);
    const minimumRatingId = Number(this.prerequisiteValue2);
    if (!Number.isFinite(requiredHours) || !Number.isFinite(minimumRatingId)) {
      return false;
    }

    const totalSeconds = user.hours.localSessions.reduce((total, session) => {
      if (session.ratingId == null || session.ratingId < minimumRatingId) {
        return total;
      }
      return total + session.duration;
    }, 0);

    return totalSeconds / 3600 >= requiredHours;
  }
}

export class PriorCourseCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "prior_course",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  async isMet(user: User): Promise<boolean> {
    const priorCourseId = this.prerequisiteValue1;
    if (!priorCourseId) {
      return false;
    }

    const priorCourse = await Course.fetchById(priorCourseId, this.db);
    if (!priorCourse) {
      return false;
    }

    return user.completedPositions.some(
      (completed) => completed.waitlistId === priorCourse.waitlist.id,
    );
  }
}

export class EarliestEnrollDateCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "earliest_enroll_date",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(_user: User): boolean {
    if (!this.prerequisiteValue1) {
      return false;
    }

    const enrollDate = new Date(`${this.prerequisiteValue1}T00:00:00`);
    if (Number.isNaN(enrollDate.getTime())) {
      return false;
    }

    return new Date() >= enrollDate;
  }
}

export class HomeControllerCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "home_controller",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(user: User): boolean {
    return user.hasFlag("controller");
  }
}

export class VisitingControllerCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "visiting_controller",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(user: User): boolean {
    return user.hasFlag("visitor");
  }
}

export class HomeOrVisitingControllerCoursePrerequisite extends CoursePrerequisite {
  constructor(
    db: DB,
    prerequisiteValue1: string | null,
    prerequisiteValue2: string | null,
    courseId: string,
    prerequisiteId: number,
  ) {
    super(
      db,
      "home_or_visiting_controller",
      prerequisiteValue1,
      prerequisiteValue2,
      courseId,
      prerequisiteId,
    );
  }

  isMet(user: User): boolean {
    return user.hasFlag(["controller", "visitor"]);
  }
}

export abstract class CourseTask {
  db: DB;
  taskType: TaskType;
  taskValue1: string | null;
  taskValue2: string | null;
  courseId: string;
  taskId: number;

  protected constructor(
    db: DB,
    taskType: TaskType,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    this.db = db;
    this.taskType = taskType;
    this.taskValue1 = taskValue1;
    this.taskValue2 = taskValue2;
    this.courseId = courseId;
    this.taskId = taskId;
  }

  static fromRow(
    db: DB,
    row: {
      taskId: number;
      taskType: string;
      taskValue1: string | null;
      taskValue2: string | null;
    },
    courseId: string,
  ): CourseTask {
    const args = [
      db,
      row.taskValue1,
      row.taskValue2,
      courseId,
      row.taskId,
    ] as const;

    switch (row.taskType) {
      case "manual":
        return new ManualCourseTask(...args);
      case "vatcan_exam":
        return new VatcanExamCourseTask(...args);
      case "moodle":
        return new MoodleCourseTask(...args);
      case "vatcan_cbt":
        return new VatcanCbtCourseTask(...args);
      case "training_session":
        return new TrainingSessionCourseTask(...args);
      case "delay":
        return new DelayCourseTask(...args);
      default:
        throw new Error(`Unknown task type: ${row.taskType}`);
    }
  }

  async start(userId: number): Promise<CourseTaskCompletion> {
    const existing = await this.db.query.courseTaskCompletions.findFirst({
      where: {
        courseId: this.courseId,
        taskId: this.taskId,
        userId,
      },
    });

    if (existing) {
      return CourseTaskCompletion.fromDBRow(existing, this.db);
    }

    const completion = (
      await this.db
        .insert(schema.courseTaskCompletions)
        .values({
          courseId: this.courseId,
          taskId: this.taskId,
          userId,
          startedAt: new Date(),
          completedAt: null,
        })
        .returning()
    )[0];

    return CourseTaskCompletion.fromDBRow(completion, this.db);
  }

  async complete(userId: number): Promise<CourseTaskCompletion> {
    const existing = await this.db.query.courseTaskCompletions.findFirst({
      where: {
        courseId: this.courseId,
        taskId: this.taskId,
        userId,
      },
    });

    if (existing?.completedAt) {
      return CourseTaskCompletion.fromDBRow(existing, this.db);
    }

    if (existing) {
      const completion = (
        await this.db
          .update(schema.courseTaskCompletions)
          .set({ completedAt: new Date() })
          .where(eq(schema.courseTaskCompletions.id, existing.id))
          .returning()
      )[0];

      return CourseTaskCompletion.fromDBRow(completion, this.db);
    }

    const now = new Date();
    const completion = (
      await this.db
        .insert(schema.courseTaskCompletions)
        .values({
          courseId: this.courseId,
          taskId: this.taskId,
          userId,
          startedAt: now,
          completedAt: now,
        })
        .returning()
    )[0];

    return CourseTaskCompletion.fromDBRow(completion, this.db);
  }

  abstract getDescription(): string;

  isAutoCompletable(): boolean {
    return false;
  }

  async getCompletion(userId: number): Promise<CourseTaskCompletion | null> {
    const row = await this.db.query.courseTaskCompletions.findFirst({
      where: {
        courseId: this.courseId,
        taskId: this.taskId,
        userId,
      },
    });

    if (!row) {
      return null;
    }

    return CourseTaskCompletion.fromDBRow(row, this.db);
  }

  protected async checkExternalCompletion(
    _userId: number,
    _env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    return false;
  }

  async isCompleted(
    userId: number,
    env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    const existing = await this.getCompletion(userId);
    if (existing?.isComplete) return true;

    if (!this.isAutoCompletable()) return false;

    const externallyComplete = await this.checkExternalCompletion(userId, env);
    if (!externallyComplete) return false;

    await this.complete(userId);
    return true;
  }
}

export class ManualCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "manual", taskValue1, taskValue2, courseId, taskId);
  }

  get label(): string | null {
    return this.taskValue1;
  }

  getDescription(): string {
    return this.label ?? "Manual task";
  }
}

export class VatcanExamCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "vatcan_exam", taskValue1, taskValue2, courseId, taskId);
  }

  get examName(): string | null {
    return this.taskValue1;
  }

  getDescription(): string {
    return `Complete the ${this.examName ?? "VATCAN"} exam`;
  }
}

export class MoodleCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "moodle", taskValue1, taskValue2, courseId, taskId);
  }

  get courseName(): string | null {
    return this.taskValue1;
  }

  getDescription(): string {
    return `Complete the Moodle course "${this.courseName ?? "Unknown"}"`;
  }

  isAutoCompletable(): boolean {
    return true;
  }

  protected async checkExternalCompletion(
    _userId: number,
    _env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    // TODO: check Moodle course completion for this.courseName / taskValue1
    return false;
  }
}

export class VatcanCbtCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "vatcan_cbt", taskValue1, taskValue2, courseId, taskId);
  }

  get blockId(): number | null {
    if (!this.taskValue1) {
      return null;
    }
    const id = Number(this.taskValue1);
    return Number.isFinite(id) ? id : null;
  }

  getDescription(): string {
    return `Complete VATCAN CBT block ${this.blockId ?? "Unknown"}`;
  }

  isAutoCompletable(): boolean {
    return true;
  }

  protected async checkExternalCompletion(
    userId: number,
    env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    const blockId = this.blockId;
    if (!blockId || !env?.VATCAN_API_TOKEN) {
      return false;
    }

    try {
      const progress = await VatcanApi.fetchCBTProgress(env, userId);
      const block = progress.training_progress
        .flatMap((f) => f.blocks)
        .find((b) => b.block_id === blockId);

      return block?.stats.percentage === 100;
    } catch {
      return false;
    }
  }
}

export class TrainingSessionCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "training_session", taskValue1, taskValue2, courseId, taskId);
  }

  get sessionType(): string | null {
    return this.taskValue1;
  }

  get sessionName(): string | null {
    return this.taskValue2;
  }

  getDescription(): string {
    return describeTrainingSessionTask(this.sessionType, this.sessionName);
  }
}

export class DelayCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: string,
    taskId: number,
  ) {
    super(db, "delay", taskValue1, taskValue2, courseId, taskId);
  }

  get unit(): "hours" | "days" {
    return this.taskValue1 === "hours" ? "hours" : "days";
  }

  get amount(): number {
    return Number(this.taskValue2 ?? 0);
  }

  getDescription(): string {
    return this.unit === "hours"
      ? `Wait ${this.amount} controlling hour(s)`
      : `Wait ${this.amount} day(s)`;
  }

  isAutoCompletable(): boolean {
    return true;
  }

  protected async checkExternalCompletion(
    _userId: number,
    _env?: Pick<Env, "VATCAN_API_TOKEN">,
  ): Promise<boolean> {
    // TODO: load in-progress completion row and check elapsed time/hours since startedAt
    return false;
  }
}

export class CourseTaskCompletion {
  db: DB;
  id: number;
  courseId: string;
  taskId: number;
  userId: number;
  startedAt: Date;
  completedAt: Date | null;

  constructor(
    db: DB,
    id: number,
    courseId: string,
    taskId: number,
    userId: number,
    startedAt: Date,
    completedAt: Date | null,
  ) {
    this.db = db;
    this.id = id;
    this.courseId = courseId;
    this.taskId = taskId;
    this.userId = userId;
    this.startedAt = startedAt;
    this.completedAt = completedAt;
  }

  static fromDBRow(
    row: schema.CourseTaskCompletionRow,
    db: DB,
  ): CourseTaskCompletion {
    return new CourseTaskCompletion(
      db,
      row.id,
      row.courseId,
      row.taskId,
      row.userId,
      row.startedAt,
      row.completedAt,
    );
  }

  get isComplete(): boolean {
    return this.completedAt !== null;
  }

  async uncomplete(): Promise<CourseTask> {
    await this.db
      .delete(schema.courseTaskCompletions)
      .where(eq(schema.courseTaskCompletions.id, this.id));

    const course = await this.db.query.courses.findFirst({
      where: { id: this.courseId },
    });

    if (!course) {
      throw new Error(`Course not found: ${this.courseId}`);
    }

    const taskRow = course.tasks.find((task) => task.taskId === this.taskId);

    if (!taskRow) {
      throw new Error(
        `Task ${this.taskId} not found on course ${this.courseId}`,
      );
    }

    return CourseTask.fromRow(this.db, taskRow, this.courseId);
  }
}

type VatcanCbtBlockStats = {
  completed_count: number;
  total_count: number;
  percentage: number;
};

type VatcanCbtBlock = {
  block_id: number;
  title: string;
  sort_order: number;
  completed_chapters: Record<string, string>;
  stats: VatcanCbtBlockStats;
  updated_at: string;
};

type VatcanCbtFacilityProgress = {
  facility: string;
  blocks: VatcanCbtBlock[];
};

type VatcanCbtProgressResponse = {
  success: string;
  cid: number;
  training_progress: VatcanCbtFacilityProgress[];
};

type VatcanApiErrorResponse = {
  error: string;
  message: string;
};

const VatcanApi = {
  async fetchCBTProgress(
    env: Pick<Env, "VATCAN_API_TOKEN">,
    cid: number,
  ): Promise<VatcanCbtProgressResponse> {
    const response = await fetch(
      `https://vatcan.ca/api/v2/user/${cid}/cbt`,
      {
        headers: {
          Authorization: `Token ${env.VATCAN_API_TOKEN}`,
        },
      },
    );

    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => null)) as VatcanApiErrorResponse | null;

      throw new Error(
        body?.message ??
          `Failed to fetch VATCAN CBT progress for CID ${cid}: ${response.statusText}`,
      );
    }

    return (await response.json()) as VatcanCbtProgressResponse;
  },
};
