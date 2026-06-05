import type { DB } from "../db";
import * as schema from "@czqm/db/schema";
import { and, eq } from "drizzle-orm";
import type { Env } from "../types";

export class Course {
  id: number;
  name: string;
  description: string | null;
  waitlist: Waitlist;
  tasks: CourseTask[];
  db: DB;

  private constructor(
    id: number,
    name: string,
    description: string | null,
    waitlist: Waitlist,
    tasks: CourseTask[],
    db: DB,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.waitlist = waitlist;
    this.tasks = tasks;
    this.db = db;
  }

  static async fetchById(id: number, db: DB): Promise<Course | null> {
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

    const waitlist = Waitlist.fromDBRow(course.waitlist, db);

    const tasks = course.tasks.map((task) =>
      CourseTask.fromRow(db, task, course.id),
    );

    return new Course(
      course.id,
      course.name,
      course.description,
      waitlist,
      tasks,
      db,
    );
  }

  static async fetchByWaitlistId(
    waitlistId: number,
    db: DB,
  ): Promise<Course | null> {
    const course = await db.query.courses.findFirst({
      where: {
        waitlist: waitlistId,
      },
      with: {
        waitlist: true,
      },
    });

    if (!course) {
      return null;
    }

    const waitlist = Waitlist.fromDBRow(course.waitlist, db);

    const tasks = course.tasks.map((task) =>
      CourseTask.fromRow(db, task, course.id),
    );

    return new Course(
      course.id,
      course.name,
      course.description,
      waitlist,
      tasks,
      db,
    );
  }

  async graduateUser(userId: number): Promise<void> {
    const waitlistId = this.waitlist.id;

    const enrolled = await this.db.query.enrolledUsers.findFirst({
      where: { waitlistId, cid: userId },
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
    await this.db.delete(schema.courses).where(eq(schema.courses.id, this.id));
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
    this.name = name;
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

export abstract class CourseTask {
  db: DB;
  taskType: TaskType;
  taskValue1: string | null;
  taskValue2: string | null;
  courseId: number;
  taskId: number;

  protected constructor(
    db: DB,
    taskType: TaskType,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: number,
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
    courseId: number,
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
    courseId: number,
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
    courseId: number,
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
    courseId: number,
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
    courseId: number,
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
    courseId: number,
    taskId: number,
  ) {
    super(db, "training_session", taskValue1, taskValue2, courseId, taskId);
  }

  get sessionType(): string | null {
    return this.taskValue1;
  }

  getDescription(): string {
    return `Complete a training session${
      this.sessionType ? ` for ${this.sessionType}` : ""
    }`;
  }
}

export class DelayCourseTask extends CourseTask {
  constructor(
    db: DB,
    taskValue1: string | null,
    taskValue2: string | null,
    courseId: number,
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
  courseId: number;
  taskId: number;
  userId: number;
  startedAt: Date;
  completedAt: Date | null;

  constructor(
    db: DB,
    id: number,
    courseId: number,
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
