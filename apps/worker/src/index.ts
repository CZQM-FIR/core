import { type } from 'arktype';
import { createDB } from './db.js';
import { handleOnlineSessions } from './onlineATC.js';
import { handleRecordSessions } from './recordSessions.js';
import { recurringEvents } from './recurringEvents.js';
import { syncDiscord } from './syncDiscord.js';
import { vatcanPull } from './vatcanPull.js';
import 'dotenv/config';
import cron from 'node-cron';
import express from 'express';

const app = express();
let lastRun: string | null = null;
let lastSuccess = true;

// Example cron job that runs every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    // Run your actual job logic here
    console.log('Running job...');
    // If it succeeds:
    lastRun = new Date().toISOString();
    lastSuccess = true;
  } catch (err) {
    console.error('Cron job failed:', err);
    lastSuccess = false;
  }
});

const Env = type({
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
  VATCAN_API_TOKEN: 'string',
  UPTIME_PORT: 'string.integer.parse?',
  NODE_ENV: '"dev"|"production"?'
});

export type Env = typeof Env.infer;

async function main(): Promise<void> {
  console.log('Initializing Cron Worker', new Date());

  const env = Env(process.env);

  if (env instanceof type.errors) {
    throw new Error(`Invalid environment variables: ${env.summary}`);
  }

  if (env.NODE_ENV === 'dev') {
    app.get('/dev/discord', async (req, res) => {
      const { db, client } = createDB(env);
      await syncDiscord(db, env);
      client.close();
      res.send('OK');
    });

    app.get('/dev/online', async (req, res) => {
      const { db, client } = createDB(env);
      await handleOnlineSessions(db, env);
      client.close();
      res.send('OK');
    });

    app.get('/dev/vatcan', async (req, res) => {
      const { db, client } = createDB(env);
      await vatcanPull(db, env);
      client.close();
      res.send('OK');
    });

    app.get('/dev/records', async (req, res) => {
      const { db, client } = createDB(env);
      await handleRecordSessions(db, env);
      client.close();
      res.send('OK');
    });

    app.get('/dev/recurring', async (req, res) => {
      const { db, client } = createDB(env);
      await recurringEvents(db);
      client.close();
      res.send('OK');
    });

    console.log('Running in development mode, manual endpoints enabled');
  } else {
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
        client.close();
      } catch (err) {
        console.error('Scheduled job failed:', err);
      }
    });

    cron.schedule('0 * * * *', async () => {
      try {
        const { db, client } = createDB(env);

        console.log('Running Record Sessions', new Date());
        await handleRecordSessions(db, env);
        console.log('Finished Record Sessions', new Date());
        client.close();
      } catch (err) {
        console.error('Scheduled hourly job failed:', err);
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

  app.get('/cron-health', (req, res) => {
    res.json({
      status: lastSuccess ? 'ok' : 'error',
      lastRun
    });
  });

  app.listen(env.UPTIME_PORT ?? 3000, () => {
    console.log(`Server running on port ${env.UPTIME_PORT ?? 3000}`);
  });
}

main().catch((err) => {
  console.error('Job failed:', err);
  process.exit(1);
});
