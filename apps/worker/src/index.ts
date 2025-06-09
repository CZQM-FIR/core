import { createDB } from './db';
import { handleRecordSessions } from './recordSessions';
import { recurringEvents } from './recurringEvents';
import { vatcanPull } from './vatcanPull';

export default {
  // cron handler
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const { db, client } = createDB(env);

    await handleRecordSessions(db);

    if (controller.cron === '*/15 * * * *') {
      await vatcanPull(db, env);
    }

    if (controller.cron === '0 0 * * *') {
      await recurringEvents(db);
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
