import * as schema from '@czqm/db/schema';
import { DB } from '.';
import { eq } from 'drizzle-orm';

export const notificationsJob = async (db: DB) => {
  // Fetch notifications that need to be sent
  const notifications = await db.query.notifications.findMany({
    where: (notifications, { isNull }) => isNull(notifications.sent),
    with: {
      user: {
        with: {
          integrations: true,
          preferences: true,
          flags: {
            with: {
              flag: true
            }
          }
        }
      }
    }
  });

  const notificationsQueue = [];
  const defaultOnPreferences = [
    'policyChanges',
    'urgentFirUpdates',
    'trainingUpdates',
    'unauthorizedConnection',
    'newEventPosted',
    'newNewsArticlePosted'
  ];

  for (const notification of notifications) {
    const { user } = notification;

    if (!user.integrations?.length) continue;

    if (
      user.preferences.some((pref) => pref.key === notification.type && Boolean(pref.value)) ||
      (!user.preferences.find((pref) => pref.key === notification.type) &&
        defaultOnPreferences.includes(notification.type))
    ) {
      notificationsQueue.push({
        id: notification.id,
        userId: user.integrations.find((i) => i.type === 0)!.integrationUserId,
        message: notification.message,
        buttons: notification.buttons,
        user
      });
    }
  }

  for await (const notification of notificationsQueue) {
    const dmRes = await fetch('https://discord.com/api/users/@me/channels', {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: notification.user.integrations.find((i) => i.type === 0)!.integrationUserId
      })
    });

    if (!dmRes.ok) {
      console.error('Failed to create DM channel:', await dmRes.text());
      continue;
    }

    const dmData: { id: string } = await dmRes.json();
    const channelId = dmData.id;

    const messageRes = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: notification.message,
        components: notification.buttons?.length
          ? [
              {
                type: 1,
                components: notification.buttons
              }
            ]
          : []
      })
    });

    if (!messageRes.ok) {
      console.error('Failed to send message:', await messageRes.text());
      continue;
    }

    await db
      .update(schema.notifications)
      .set({ sent: new Date() })
      .where(eq(schema.notifications.id, notification.id));
  }
};
