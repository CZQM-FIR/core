import { createDB } from './db';
// import { handleRecordSessions } from './recordSessions';
import { handleOnlineSessions } from './onlineATC';
import { handleRecordSessions } from './recordSessions';
import { recurringEvents } from './recurringEvents';
import { syncDiscord } from './syncDiscord';
import { vatcanPull } from './vatcanPull';

export default {
  // cron handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const { db, client } = createDB(env);
    console.log(`Worker triggered by cron: ${controller.cron}`);

    if (controller.cron === '* * * * *') {
      await handleOnlineSessions(db, env);
    }

    if (controller.cron === '*/2 * * * *') {
      await syncDiscord(db, env);
    }

    if (controller.cron === '*/15 * * * *') {
      await vatcanPull(db, env);
    }

    if (controller.cron === '0 2 * * *') {
      // await recurringEvents(db);
      await handleRecordSessions(db);
    }

    client.close();
  },
  async fetch() {
    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
  }
} satisfies ExportedHandler<Env>;
