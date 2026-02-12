import * as schema from '@czqm/db/schema';
import { DB, Env } from '@czqm/common';
import { eq } from 'drizzle-orm';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { type } from 'arktype';

interface NotificationQueueItem {
  id: string;
  user: schema.User & {
    integrations: schema.Integration[];
    preferences: schema.Preference[];
    flags: schema.Flag[];
  };
}

interface DiscordNotificationQueueItem extends NotificationQueueItem {
  buttons?:
    | {
        type: number;
        style: number;
        label?: string;
        custom_id?: string;
        url?: string;
        disabled?: boolean;
      }[]
    | null;
  userId: string;
  message: string;
}

interface EmailNotificationQueueItem extends NotificationQueueItem {
  subject: string;
  body: string;
  to?: string;
  bcc?: string[];
  replyto?: string;
}

const sendEmail = async (notification: EmailNotificationQueueItem, env: Env) => {
  const { to, bcc, user, subject, body } = notification;

  const sesClient = new SESClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    const command = new SendEmailCommand({
      Source: env.AWS_SENDER_EMAIL,
      ...(notification.replyto && { ReplyToAddresses: [notification.replyto] }),
      Destination: {
        ToAddresses: [to || user.email],
        BccAddresses: bcc || []
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: body
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject
        }
      }
    });

    const data = await sesClient.send(command);
    console.log('Email sent:', data.MessageId);
    return { success: true };
  } catch (err: unknown) {
    console.error('Error sending email:', err);
    return { success: false, error: err };
  }
};

const sendDiscordMessage = async (env: Env, notification: DiscordNotificationQueueItem) => {
  const dmRes = await fetch('https://discord.com/api/users/@me/channels', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      recipient_id: notification.user.integrations.find((i) => i.type === 0)!.integrationUserId
    })
  });

  if (!dmRes.ok) {
    console.error('Failed to create DM channel:', await dmRes.text());
    return false;
  }

  const dmData: { id: string } = await dmRes.json();
  const channelId = dmData.id;

  return await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
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
};

export const notificationsJob = async (db: DB, env: Env) => {
  // Fetch notifications that need to be sent
  const notifications = await db.query.notifications.findMany({
    where: { sent: { isNull: true } },
    with: {
      user: {
        with: {
          integrations: true,
          preferences: true,
          flags: true
        }
      }
    }
  });

  const discordNotificationQueue = [];
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
      user.preferences.some((pref) => pref.key === notification.type && pref.value === 'true') ||
      (!user.preferences.find((pref) => pref.key === notification.type) &&
        defaultOnPreferences.includes(notification.type))
    ) {
      if (notification.location === 'discord') {
        discordNotificationQueue.push({
          id: notification.id,
          userId: user.integrations.find((i) => i.type === 0)!.integrationUserId,
          message: notification.message,
          buttons: notification.buttons,
          user
        });
      } else if (notification.location === 'email') {
        const MessageJson = type({
          to: 'string.email?',
          bcc: 'string.email[]?',
          subject: 'string',
          body: 'string',
          replyto: 'string.email?'
        });

        const messageJson = MessageJson(JSON.parse(notification.message));

        if (!(messageJson instanceof type.errors)) {
          const { to, bcc, subject, body, replyto } = messageJson;

          const email = await sendEmail(
            {
              id: notification.id,
              to,
              bcc,
              subject,
              body,
              user,
              replyto
            },
            env
          );

          if (email.success) {
            await db
              .update(schema.notifications)
              .set({ sent: new Date() })
              .where(eq(schema.notifications.id, notification.id));
          }
        } else {
          console.error(
            'Invalid email message JSON for notification ID:',
            notification.id,
            messageJson.summary
          );
        }
      }
    }
  }

  for await (const notification of discordNotificationQueue) {
    const messageRes = await sendDiscordMessage(env, notification);

    if (messageRes && !messageRes.ok) {
      console.error('Failed to send message:', await messageRes.text());
      continue;
    }

    await db
      .update(schema.notifications)
      .set({ sent: new Date() })
      .where(eq(schema.notifications.id, notification.id));
  }
};
