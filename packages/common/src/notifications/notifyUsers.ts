import * as schema from "@czqm/db/schema";
import type { NotificationPayload } from "./types";
import { requiredNotifications } from "./types";

type DrizzleDB = {
  query: {
    users: {
      findMany: (opts?: unknown) => Promise<UserWithRelations[]>;
    };
  };
  insert: <T extends typeof schema.notifications>(
    table: T
  ) => {
    values: (
      values: (typeof schema.notifications.$inferInsert)[]
    ) => Promise<void>;
  };
};

type UserWithRelations = typeof schema.users.$inferSelect & {
  flags: { flag: { name: string } }[];
  integrations: { type: number }[];
  preferences: { key: string; value: string }[];
};

export interface NotifyUsersOptions {
  db: DrizzleDB;
  webUrl: string;
}

/**
 * Queue notifications to be sent to users via Discord DM.
 * Notifications are inserted into the database and processed by the worker.
 */
export const notifyUsers = async (
  payload: NotificationPayload,
  options: NotifyUsersOptions,
  users: number[] = []
) => {
  const { message, type, title } = payload;
  const { db, webUrl } = options;

  let members = await db.query.users.findMany({
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
    members = members.filter((m) => users.includes(m.cid));
  }

  members = members.filter((m) => {
    if (!m.flags.some((f) => ["controller", "visitor"].includes(f.flag.name)))
      return false;
    if (!m.integrations.some((i) => i.type === 0)) return false;
    if (requiredNotifications.includes(type)) {
      return true;
    } else {
      return m.preferences.some((p) => p.key === type && p.value === "true");
    }
  });

  const values: (typeof schema.notifications.$inferInsert)[] = members.map(
    (m) => ({
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
    })
  );

  if (values.length > 0) {
    await db.insert(schema.notifications).values(values);
  }
};
