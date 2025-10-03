import { type } from 'arktype';
import { createDB } from './db';
import { handleOnlineSessions } from './onlineATC';
import { handleRecordSessions } from './recordSessions';
import { recurringEvents } from './recurringEvents';
import { syncDiscord } from './syncDiscord';
import { vatcanPull } from './vatcanPull';
import 'dotenv/config';
import cron from 'node-cron';

const Env = type({
  VATSIM_CLIENT_ID: 'string.integer',
  VATSIM_CLIENT_SECRET: 'string',
  VATSIM_URL: 'string.url',
  TURSO_URL: 'string',
  TURSO_TOKEN: 'string',
  PUBLIC_WEB_URL: 'string.url',
  PUBLIC_OVERSEER_URL: 'string.url',
  CLOUDFLARE_ACCOUNT_ID: 'string',
  R2_ACCESS_KEY_ID: 'string',
  R2_ACCESS_KEY: 'string',
  R2_BUCKET_NAME: 'string',
  WEBHOOK_ONLINE_CONTROLLERS: 'string',
  WEBHOOK_UNAUTHORIZED_CONTROLLER: 'string',
  DISCORD_BOT_TOKEN: 'string',
  DISCORD_GUILD_ID: 'string',
  RECORD_SESSIONS_DELAY: 'number.integer>=0',
  VATCAN_API_TOKEN: 'string'
});

export type Env = typeof Env.infer;

async function main(): Promise<void> {
  console.log('Running cron job at', new Date());

  const env = Env(process.env);

  if (env instanceof type.errors) {
    throw new Error(`Invalid environment variables: ${env.summary}`);
  }

  cron.schedule('* * * * *', async () => {
    try {
      const { db, client } = createDB(env);
      await handleOnlineSessions(db, env);
      await handleRecordSessions(db, env);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    }
  });

  cron.schedule('*/2 * * * *', async () => {
    try {
      const { db, client } = createDB(env);
      await syncDiscord(db, env);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    }
  });

  cron.schedule('*/15 * * * *', async () => {
    try {
      const { db, client } = createDB(env);
      await vatcanPull(db, env);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    }
  });

  cron.schedule('0 2 * * *', async () => {
    try {
      const { db, client } = createDB(env);
      await recurringEvents(db);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    }
  });
}

main().catch((err) => {
  console.error('Job failed:', err);
  process.exit(1);
});
