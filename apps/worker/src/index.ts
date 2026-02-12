import { type } from 'arktype';
import { createDB } from '@czqm/common';
import { handleOnlineSessions } from './onlineATC.js';
import { handleRecordSessions } from './recordSessions.js';
import { recurringEvents } from './recurringEvents.js';
import { syncDiscord } from './syncDiscord.js';
import { vatcanPull } from './vatcanPull.js';
import 'dotenv/config';
import cron from 'node-cron';
import express from 'express';
import { syncMoodle } from './syncMoodle.js';
import { notificationsJob } from './notifications.js';
import { fixWaitlistsJob } from './fixWaitlist.js';
import { Env } from '@czqm/common';

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

async function main(): Promise<void> {
  console.log('Initializing Cron Worker', new Date());

  const env = Env(process.env);

  if (env instanceof type.errors) {
    throw new Error(`Invalid environment variables: ${env.summary}`);
  }

  const db = createDB(env);

  if (env.NODE_ENV === 'dev') {
    app.get('/dev/discord', async (req, res) => {
      await syncDiscord(db, env);
      res.send('OK');
    });

    app.get('/dev/online', async (req, res) => {
      await handleOnlineSessions(db, env);
      res.send('OK');
    });

    app.get('/dev/vatcan', async (req, res) => {
      await vatcanPull(db, env);

      res.send('OK');
    });

    app.get('/dev/records', async (req, res) => {
      await handleRecordSessions(db, env);

      res.send('OK');
    });

    app.get('/dev/recurring', async (req, res) => {
      await recurringEvents(db);

      res.send('OK');
    });

    app.get('/dev/moodle', async (req, res) => {
      await syncMoodle(db, env);

      res.send('OK');
    });

    app.get('/dev/notifications', async (req, res) => {
      await notificationsJob(db, env);

      res.send('OK');
    });

    app.get('/dev/fixwaitlists', async (req, res) => {
      await fixWaitlistsJob(db);

      res.send('OK');
    });

    console.log('Running in development mode, manual endpoints enabled');
  } else {
    cron.schedule('* * * * *', async () => {
      try {
        console.log('Running Online ATC Handler', new Date());
        await handleOnlineSessions(db, env);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Online ATC Handler', new Date());
      }

      try {
        console.log('Running Moodle Sync', new Date());
        await syncMoodle(db, env);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Moodle Sync', new Date());
      }

      try {
        console.log('Running Notifications Job', new Date());
        await notificationsJob(db, env);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Notifications Job', new Date());
      }
    });

    cron.schedule('*/2 * * * *', async () => {
      try {
        console.log('Running Discord Sync', new Date());
        await syncDiscord(db, env);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Discord Sync', new Date());
      }
    });

    cron.schedule('*/15 * * * *', async () => {
      try {
        console.log('Running VATCAN sync', new Date());
        await vatcanPull(db, env);
        console.log('Finished VATCAN sync', new Date());
      } catch (err) {
        console.error('Scheduled job failed:', err);
      }
    });

    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Running Record Sessions', new Date());
        await handleRecordSessions(db, env);
        console.log('Finished Record Sessions', new Date());
      } catch (err) {
        console.error('Scheduled hourly job failed:', err);
      }
    });

    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Running Recurring Events', new Date());
        await recurringEvents(db);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Recurring Events', new Date());
      }

      try {
        console.log('Running Fix Waitlists', new Date());
        await fixWaitlistsJob(db);
      } catch (err) {
        console.error('Scheduled job failed:', err);
      } finally {
        console.log('Finished Fix Waitlists', new Date());
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
