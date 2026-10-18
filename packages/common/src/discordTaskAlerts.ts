import { and, eq } from "drizzle-orm";
import { discordTaskAlerts } from "@czqm/db/schema";
import type { DB } from "./db";

const DISCORD_API = "https://discord.com/api/v10";

export const MANUAL_TASK_ALERT_TYPES = [
  "manual",
  "vatcan_exam",
  "certify",
  "solo",
] as const;

export function isManualTaskAlertType(taskType: string): boolean {
  return (MANUAL_TASK_ALERT_TYPES as readonly string[]).includes(taskType);
}

export const MANUAL_TASK_BUTTON_PREFIX = "mtc";

export function manualTaskButtonId(
  courseId: string,
  taskId: number,
  cid: number,
): string {
  return `${MANUAL_TASK_BUTTON_PREFIX}:${courseId}:${taskId}:${cid}`;
}

export function parseManualTaskButtonId(
  customId: string,
): { courseId: string; taskId: number; cid: number } | null {
  const [prefix, courseId, taskIdStr, cidStr] = customId.split(":");
  if (prefix !== MANUAL_TASK_BUTTON_PREFIX || !courseId) return null;
  const taskId = Number(taskIdStr);
  const cid = Number(cidStr);
  if (!Number.isInteger(taskId) || !Number.isInteger(cid)) return null;
  return { courseId, taskId, cid };
}

/** Deletes a Discord message; a 404 (already gone) is treated as success. */
export async function deleteDiscordMessage(
  botToken: string,
  channelId: string,
  messageId: string,
): Promise<boolean> {
  const response = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
    { method: "DELETE", headers: { Authorization: `Bot ${botToken}` } },
  );
  if (response.ok || response.status === 404) return true;
  console.error(
    `Failed to delete Discord message ${messageId}: ${response.status} ${response.statusText}`,
  );
  return false;
}

/**
 * Removes the Discord alert (message + row) for a student's task, if one exists.
 * Never throws; the worker poll acts as a fallback for any failure.
 */
export async function deleteTaskAlert(
  db: DB,
  botToken: string | undefined,
  courseId: string,
  taskId: number,
  cid: number,
): Promise<void> {
  try {
    const where = and(
      eq(discordTaskAlerts.courseId, courseId),
      eq(discordTaskAlerts.taskId, taskId),
      eq(discordTaskAlerts.cid, cid),
    );
    const [alert] = await db.select().from(discordTaskAlerts).where(where).limit(1);
    if (!alert) return;

    if (alert.messageId) {
      if (!botToken) return; // leave row so the worker poll can delete the message
      const deleted = await deleteDiscordMessage(
        botToken,
        alert.channelId,
        alert.messageId,
      );
      if (!deleted) return;
    }
    await db.delete(discordTaskAlerts).where(eq(discordTaskAlerts.id, alert.id));
  } catch (err) {
    console.error("Failed to delete Discord task alert", err);
  }
}
