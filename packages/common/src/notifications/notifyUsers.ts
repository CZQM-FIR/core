import * as schema from "@czqm/db/schema";
import type {
  NotificationPayload,
  NotifyUsersOptions,
  UserWithRelations,
} from "./types";
import { requiredNotifications } from "./types";
import type { LibSQLDatabase } from "drizzle-orm/libsql";

/**
 * Queue notifications to be sent to users via Discord DM.
 * Notifications are inserted into the database and processed by the worker.
 */
export const notifyUsersViaDiscord = async (
  payload: NotificationPayload,
  options: NotifyUsersOptions,
  users: number[] = []
) => {
  const { message, type, title, location = "email" } = payload;
  const { db, webUrl } = options;

  let usersToNotify: UserWithRelations[] = await db.query.users.findMany({
    with: {
      flags: {
        with: {
          flag: true,
        },
      },
      integrations: true,
      preferences: true,
    },
  });

  if (users.length > 0) {
    usersToNotify = usersToNotify.filter((m) => users.includes(m.cid));
  }

  usersToNotify = usersToNotify.filter((m) => {
    if (!m.flags.some((f) => ["controller", "visitor"].includes(f.flag.name)))
      return false;
    if (requiredNotifications.includes(type)) {
      return true;
    } else {
      return m.preferences.some((p) => p.key === type && p.value === "true");
    }
  });

  const values: (typeof schema.notifications.$inferInsert)[] =
    usersToNotify.map((m) => ({
      timestamp: new Date(),
      userId: m.cid,
      type,
      message: title ? `**${title}**\n\n${message}` : message,
      buttons: [
        {
          type: 2,
          style: 5,
          label: "Manage Notifications",
          url: `${webUrl}/my/preferences`,
        },
      ],
      location: m.integrations.some((i) => i.type === 0) ? location : "email",
    }));

  if (values.length > 0) {
    await db.insert(schema.notifications).values(values);
  }
};
