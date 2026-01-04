export type NotificationType =
  | "policyChanges"
  | "urgentFirUpdates"
  | "trainingUpdates"
  | "unauthorizedConnection"
  | "newEventPosted"
  | "newNewsArticlePosted";

export interface NotificationPayload {
  type: NotificationType;
  title?: string;
  message: string;
}

export const requiredNotifications: NotificationType[] = [
  "policyChanges",
  "urgentFirUpdates",
  "trainingUpdates",
  "unauthorizedConnection",
];

export const defaultOnPreferences: NotificationType[] = [
  "policyChanges",
  "urgentFirUpdates",
  "trainingUpdates",
  "unauthorizedConnection",
  "newEventPosted",
  "newNewsArticlePosted",
];
