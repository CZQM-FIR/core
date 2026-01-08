import { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@czqm/db/schema";

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
  location?: "email" | "discord";
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

export type UserWithRelations = typeof schema.users.$inferSelect & {
  flags: { flag: { name: string } }[];
  integrations: { type: number }[];
  preferences: { key: string; value: string }[];
};

export interface NotifyUsersOptions {
  db: LibSQLDatabase<typeof schema>;
  webUrl: string;
}
