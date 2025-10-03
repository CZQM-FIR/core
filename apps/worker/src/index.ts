import { type } from 'arktype';
import { createDB } from './db.js';
import { handleOnlineSessions } from './onlineATC.js';
import { handleRecordSessions } from './recordSessions.js';
import { recurringEvents } from './recurringEvents.js';
import { syncDiscord } from './syncDiscord.js';
import { vatcanPull } from './vatcanPull.js';
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
  DISCORD_GUILD_ID: 'string.integer',
  RECORD_SESSIONS_DELAY: 'string.integer.parse',
  VATCAN_API_TOKEN: 'string'
});

export type Env = typeof Env.infer;

async function main(): Promise<void> {
  console.log('Initializing Cron Worker', new Date());

  const env = Env(process.env);

  if (env instanceof type.errors) {
    throw new Error(`Invalid environment variables: ${env.summary}`);
  }

  cron.schedule('* * * * *', async () => {
    try {
      const { db, client } = createDB(env);

      console.log('Running Online ATC Handler', new Date());
      await handleOnlineSessions(db, env);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    } finally {
      console.log('Finished Online ATC Handler', new Date());
    }
  });

  cron.schedule('*/2 * * * *', async () => {
    try {
      const { db, client } = createDB(env);

      console.log('Running Discord Sync', new Date());
      await syncDiscord(db, env);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    } finally {
      console.log('Finished Discord Sync', new Date());
    }
  });

  cron.schedule('*/15 * * * *', async () => {
    try {
      const { db, client } = createDB(env);
      console.log('Running VATCAN sync', new Date());
      await vatcanPull(db, env);
      console.log('Finished VATCAN sync', new Date());

      console.log('Running Record Sessions', new Date());
      await handleRecordSessions(db, env);
      console.log('Finished Record Sessions', new Date());
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    }
  });

  cron.schedule('0 2 * * *', async () => {
    try {
      const { db, client } = createDB(env);

      console.log('Running Recurring Events', new Date());
      await recurringEvents(db);
      client.close();
    } catch (err) {
      console.error('Scheduled job failed:', err);
    } finally {
      console.log('Finished Recurring Events', new Date());
    }
  });
}

main().catch((err) => {
  console.error('Job failed:', err);
  process.exit(1);
});
