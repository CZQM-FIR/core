/**
 * Notification types and services
 * Following SRP: Only handles notification formatting and sending
 */

export type UnauthorizedReason =
  | "discord"
  | "inactive"
  | "roster"
  | "suspended"
  | "nonczqm";

// OCP: Add new reasons here without modifying getReasonText
const REASON_MESSAGES: Readonly<Record<UnauthorizedReason, string>> = {
  discord: "No Discord Account linked",
  inactive: "User is marked as Inactive",
  roster: "User does not have correct authorization on the roster",
  suspended: "User is Suspended on VATSIM",
  nonczqm: "User is not a CZQM member",
};

/**
 * Get human-readable text for an unauthorized reason
 */
export function getUnauthorizedReasonText(reason: UnauthorizedReason): string {
  return REASON_MESSAGES[reason] ?? "Unknown reason";
}

export interface SessionNotificationData {
  userName: string;
  userCid: number;
  positionName: string;
  positionCallsign: string;
  logonTime: Date;
}

import { formatUtcTime } from "../datetime/index.js";

/**
 * Format an authorized session notification message
 */
export function formatAuthorizedSessionMessage(
  data: SessionNotificationData
): string {
  const timestamp = Math.floor(data.logonTime.getTime() / 1000);
  const timeStr = formatUtcTime(data.logonTime);
  return `📡 ${data.userName} (${data.userCid}) has connected to ${data.positionName} (${data.positionCallsign}) at ${timeStr} (<t:${timestamp}:R>).`;
}

/**
 * Format an unauthorized session notification message
 */
export function formatUnauthorizedSessionMessage(
  data: SessionNotificationData,
  reason: UnauthorizedReason
): string {
  const timestamp = Math.floor(data.logonTime.getTime() / 1000);
  const timeStr = formatUtcTime(data.logonTime);
  const reasonText = getUnauthorizedReasonText(reason);
  return `⚠️⚠️ ${data.userName} (${data.userCid}) has started an UNAUTHORIZED connection to ${data.positionName} (${data.positionCallsign}) at ${timeStr} (<t:${timestamp}:R>). Reason: ${reasonText} ⚠️⚠️`;
}

export interface WebhookConfig {
  url: string;
}

/**
 * Discord webhook notification sender
 * Following ISP: Only requires the specific config it needs
 */
export class DiscordWebhookNotifier {
  constructor(private readonly webhookUrl: string) {}

  async send(message: string): Promise<void> {
    const token = this.webhookUrl.split("/").pop();
    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, token }),
    });
  }
}

/**
 * Session notification service
 * Following SRP: Coordinates notification formatting and sending
 */
export class SessionNotificationService {
  constructor(
    private readonly authorizedNotifier: DiscordWebhookNotifier,
    private readonly unauthorizedNotifier: DiscordWebhookNotifier
  ) {}

  async notifyAuthorized(data: SessionNotificationData): Promise<void> {
    const message = formatAuthorizedSessionMessage(data);
    await this.authorizedNotifier.send(message);
    console.log("Session notification sent:", message);
  }

  async notifyUnauthorized(
    data: SessionNotificationData,
    reason: UnauthorizedReason
  ): Promise<void> {
    const message = formatUnauthorizedSessionMessage(data, reason);
    await this.unauthorizedNotifier.send(message);
    console.log("Unauthorized session notification sent:", message);
  }
}
