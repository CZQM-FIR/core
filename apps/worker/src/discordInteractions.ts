import { createPublicKey, verify } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  Course,
  User,
  completeCourseTaskForStudent,
  deleteTaskAlert,
  describeCourseTask,
  isManualTaskAlertType,
  parseManualTaskButtonId,
  requiresInstructorToComplete,
  userCanCompleteInstructorOnlyCourseTasks,
  userHasVectorInstructorAccess,
  type DB,
  type Env
} from '@czqm/common';

// Ed25519 SPKI DER prefix for a raw 32-byte public key
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const EPHEMERAL = 64;
const DISCORD_API = 'https://discord.com/api/v10';

function verifySignature(publicKeyHex: string, signature: string, timestamp: string, body: Buffer) {
  try {
    const key = createPublicKey({
      key: Buffer.concat([SPKI_PREFIX, Buffer.from(publicKeyHex, 'hex')]),
      format: 'der',
      type: 'spki'
    });
    return verify(
      null,
      Buffer.concat([Buffer.from(timestamp), body]),
      key,
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

type Interaction = {
  type: number;
  application_id?: string;
  token?: string;
  data?: { custom_id?: string };
  member?: { user?: { id?: string } };
  user?: { id?: string };
};

type CompleteResult = {
  content: string;
  alertToDelete?: { courseId: string; taskId: number; cid: number };
};

async function editOriginalResponse(interaction: Interaction, content: string) {
  if (!interaction.application_id || !interaction.token) {
    throw new Error('Discord interaction is missing its application ID or token');
  }

  const response = await fetch(
    `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } })
    }
  );
  if (!response.ok) {
    throw new Error(
      `Discord response update failed (${response.status}): ${await response.text()}`
    );
  }
}

async function handleComplete(
  db: DB,
  env: Pick<Env, 'DISCORD_BOT_TOKEN' | 'PUBLIC_VECTOR_URL'>,
  interaction: Interaction
): Promise<CompleteResult> {
  const parsed = parseManualTaskButtonId(interaction.data?.custom_id ?? '');
  if (!parsed) return { content: 'Unknown action.' };
  const { courseId, taskId, cid } = parsed;

  const discordId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!discordId) return { content: 'Could not identify you.' };

  const integration = await db.query.integrations.findFirst({
    where: { type: 0, integrationUserId: discordId }
  });
  const actioner = integration ? await User.fromCid(db, integration.cid) : null;
  if (!actioner) {
    return { content: 'Link your Discord account on the CZQM website to use this button.' };
  }
  if (!userHasVectorInstructorAccess(actioner)) {
    return { content: 'Only instructors and mentors can complete this task.' };
  }

  const course = await Course.fetchById(courseId, db);
  const task = course?.tasks.find((entry) => entry.taskId === taskId);
  if (!course || !task || !isManualTaskAlertType(task.taskType)) {
    return {
      content: 'This task no longer exists.',
      alertToDelete: { courseId, taskId, cid }
    };
  }
  if (
    requiresInstructorToComplete(task.taskType) &&
    !userCanCompleteInstructorOnlyCourseTasks(actioner)
  ) {
    return { content: 'Only instructors can mark this task complete.' };
  }

  const enrolled = await db.query.enrolledUsers.findFirst({
    where: { waitlistId: course.waitlist.id, cid, hiddenAt: { isNull: true } }
  });
  if (!enrolled || enrolled.pausedAt) {
    return { content: 'Student is not actively enrolled in this course.' };
  }

  const completions = await db.query.courseTaskCompletions.findMany({
    where: { userId: cid, courseId }
  });
  const completed = new Set(completions.filter((c) => c.completedAt != null).map((c) => c.taskId));
  if (completed.has(taskId)) {
    return {
      content: 'This task was already completed.',
      alertToDelete: { courseId, taskId, cid }
    };
  }
  const next = course.tasks.find((entry) => !completed.has(entry.taskId));
  if (next?.taskId !== taskId) {
    return { content: 'Complete all previous tasks first.' };
  }

  try {
    await completeCourseTaskForStudent(db, task, cid, actioner.cid, {
      vectorUrl: env.PUBLIC_VECTOR_URL
    });
  } catch (err) {
    console.error('Failed to complete task from Discord', err);
    return { content: err instanceof Error ? err.message : 'Failed to complete task.' };
  }

  return {
    content: `Marked complete: ${describeCourseTask(task)} (CID ${cid}).`,
    alertToDelete: { courseId, taskId, cid }
  };
}

export function createDiscordInteractionsHandler(
  db: DB,
  env: Pick<Env, 'DISCORD_BOT_TOKEN' | 'DISCORD_PUBLIC_KEY' | 'PUBLIC_VECTOR_URL'>
) {
  return async (req: Request, res: Response) => {
    if (!env.DISCORD_PUBLIC_KEY) {
      res.status(503).send('Discord interactions are not configured');
      return;
    }

    const signature = req.header('X-Signature-Ed25519');
    const timestamp = req.header('X-Signature-Timestamp');
    const body = req.body;
    if (!signature || !timestamp || !Buffer.isBuffer(body)) {
      res.status(401).send('invalid request signature');
      return;
    }
    if (!verifySignature(env.DISCORD_PUBLIC_KEY, signature, timestamp, body)) {
      res.status(401).send('invalid request signature');
      return;
    }

    let interaction: Interaction;
    try {
      interaction = JSON.parse(body.toString('utf8'));
    } catch {
      res.status(400).send('bad request');
      return;
    }

    try {
      if (interaction.type === 1) {
        res.json({ type: 1 });
        return;
      }
      if (interaction.type === 3) {
        res.json({ type: 5, data: { flags: EPHEMERAL } });

        let result: CompleteResult;
        try {
          result = await handleComplete(db, env, interaction);
        } catch (err) {
          console.error('Discord interaction failed', err);
          result = { content: 'Something went wrong. Please try again.' };
        }

        try {
          await editOriginalResponse(interaction, result.content);
        } catch (err) {
          console.error('Failed to update Discord interaction response', err);
        }
        if (result.alertToDelete) {
          const { courseId, taskId, cid } = result.alertToDelete;
          await deleteTaskAlert(db, env.DISCORD_BOT_TOKEN, courseId, taskId, cid);
        }
        return;
      }
      res.status(400).send('unsupported interaction');
    } catch (err) {
      console.error('Discord interaction failed', err);
      if (!res.headersSent) {
        res.json({
          type: 4,
          data: {
            content: 'Something went wrong. Please try again.',
            flags: EPHEMERAL,
            allowed_mentions: { parse: [] }
          }
        });
      }
    }
  };
}
