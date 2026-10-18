import { eq } from 'drizzle-orm';
import {
  Course,
  CourseTask,
  User,
  deleteDiscordMessage,
  describeCourseTask,
  formatCourseTaskType,
  isManualTaskAlertType,
  manualTaskButtonId,
  type DB,
  type Env
} from '@czqm/common';
import { discordTaskAlerts, type DiscordTaskAlertRow } from '@czqm/db/schema';

const DISCORD_API = 'https://discord.com/api/v10';
const VATCAN_EXAM_CENTRE_URL = 'https://vatcan.ca/manage/training/exams/assign';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type AlertEnv = Pick<Env, 'DISCORD_BOT_TOKEN' | 'DISCORD_TASK_CHANNEL_ID' | 'PUBLIC_VECTOR_URL'>;

const alertKey = (courseId: string, taskId: number, cid: number) => `${courseId}:${taskId}:${cid}`;

type Desired = {
  courseId: string;
  courseName: string;
  task: CourseTask;
  cid: number;
};

async function postAlertMessage(
  env: AlertEnv & { DISCORD_TASK_CHANNEL_ID: string },
  desired: Desired,
  studentName: string
): Promise<string | null> {
  const { courseId, courseName, task, cid } = desired;
  const link = env.PUBLIC_VECTOR_URL ? `${env.PUBLIC_VECTOR_URL}/i/${courseId}/${cid}` : null;

  const body = {
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: 'Manual task reached',
        color: 0xf59e0b,
        fields: [
          { name: 'Student', value: `${studentName} (${cid})`, inline: true },
          { name: 'Course', value: courseName, inline: true },
          {
            name: formatCourseTaskType(task.taskType),
            value: describeCourseTask(task)
          }
        ],
        ...(link ? { url: link } : {}),
        timestamp: new Date().toISOString()
      }
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: 'Mark complete',
            custom_id: manualTaskButtonId(courseId, task.taskId, cid)
          },
          ...(link ? [{ type: 2, style: 5, label: 'Open in Vector', url: link }] : []),
          ...(task.taskType === 'vatcan_exam'
            ? [
                {
                  type: 2,
                  style: 5,
                  label: 'VATCAN Exam Centre',
                  url: VATCAN_EXAM_CENTRE_URL
                }
              ]
            : [])
        ]
      }
    ]
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(
      `${DISCORD_API}/channels/${env.DISCORD_TASK_CHANNEL_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after') ?? '1');
      await sleep(Math.ceil(retryAfter * 1000) + 250);
      continue;
    }
    if (!response.ok) {
      console.error(
        `Failed to post manual task alert: ${response.status} ${response.statusText} ${await response.text()}`
      );
      return null;
    }
    const json = (await response.json()) as { id?: string };
    return json.id ?? null;
  }
  return null;
}

async function removeAlert(env: AlertEnv, db: DB, alert: DiscordTaskAlertRow) {
  if (alert.messageId) {
    const deleted = await deleteDiscordMessage(
      env.DISCORD_BOT_TOKEN,
      alert.channelId,
      alert.messageId
    );
    if (!deleted) return;
    await sleep(300);
  }
  await db.delete(discordTaskAlerts).where(eq(discordTaskAlerts.id, alert.id));
}

/**
 * Posts a Discord message for every enrolled student whose next incomplete task is
 * manually completed, and removes messages whose task is no longer pending.
 */
export const manualTaskAlertsJob = async (db: DB, env: AlertEnv) => {
  const channelId = env.DISCORD_TASK_CHANNEL_ID;
  if (!channelId) return;
  const alertEnv = { ...env, DISCORD_TASK_CHANNEL_ID: channelId };

  const enrolled = await db.query.enrolledUsers.findMany({
    where: { hiddenAt: { isNull: true }, pausedAt: { isNull: true } }
  });

  const courseByWaitlistId = new Map<number, Course | null>();
  const desiredByKey = new Map<string, Desired>();

  for (const row of enrolled) {
    let course = courseByWaitlistId.get(row.waitlistId);
    if (course === undefined) {
      course = (await Course.fetchByWaitlistId(row.waitlistId, db)) ?? null;
      courseByWaitlistId.set(row.waitlistId, course);
    }
    if (!course || course.tasks.length === 0) continue;

    const completions = await db.query.courseTaskCompletions.findMany({
      where: { userId: row.cid, courseId: course.id }
    });
    const completed = new Set(
      completions.filter((c) => c.completedAt != null).map((c) => c.taskId)
    );
    const next = course.tasks.find((task) => !completed.has(task.taskId));
    if (!next || !isManualTaskAlertType(next.taskType)) continue;

    desiredByKey.set(alertKey(course.id, next.taskId, row.cid), {
      courseId: course.id,
      courseName: course.name,
      task: next,
      cid: row.cid
    });
  }

  const existing = await db.select().from(discordTaskAlerts);
  const existingByKey = new Map(existing.map((a) => [alertKey(a.courseId, a.taskId, a.cid), a]));

  // Remove stale alerts
  for (const alert of existing) {
    if (desiredByKey.has(alertKey(alert.courseId, alert.taskId, alert.cid))) continue;
    try {
      await removeAlert(env, db, alert);
    } catch (err) {
      console.error('Failed to remove manual task alert', err);
    }
  }

  // Post new alerts
  const toPost = [...desiredByKey.entries()].filter(([key]) => !existingByKey.get(key)?.messageId);
  if (toPost.length === 0) return;

  const users = await User.fromCids(
    db,
    toPost.map(([, d]) => d.cid)
  );
  const nameByCid = new Map(users.map((u) => [u.cid, u.displayName]));

  for (const [key, desired] of toPost) {
    try {
      let alert = existingByKey.get(key);
      if (!alert) {
        const inserted = await db
          .insert(discordTaskAlerts)
          .values({
            courseId: desired.courseId,
            taskId: desired.task.taskId,
            cid: desired.cid,
            channelId
          })
          .onConflictDoNothing()
          .returning();
        alert = inserted[0];
        if (!alert) continue;
      }

      const messageId = await postAlertMessage(
        alertEnv,
        desired,
        nameByCid.get(desired.cid) ?? `CID ${desired.cid}`
      );
      if (!messageId) {
        await db.delete(discordTaskAlerts).where(eq(discordTaskAlerts.id, alert.id));
        continue;
      }
      await db
        .update(discordTaskAlerts)
        .set({ messageId, channelId })
        .where(eq(discordTaskAlerts.id, alert.id));
      await sleep(500);
    } catch (err) {
      console.error('Failed to post manual task alert', err);
    }
  }
};
