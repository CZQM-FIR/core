/**
 * Cron Job Runner
 * Following SRP: Only handles job scheduling and execution lifecycle
 */
import cron from 'node-cron';

export interface CronJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
}

export interface DatabaseConnection<TDb> {
  db: TDb;
  client: { close: () => void };
}

export class CronJobRunner {
  private jobs: CronJob[] = [];

  /**
   * Register a job to be scheduled
   */
  register(job: CronJob): void {
    this.jobs.push(job);
  }

  /**
   * Start all registered jobs
   */
  start(): void {
    for (const job of this.jobs) {
      cron.schedule(job.schedule, async () => {
        console.log(`Running ${job.name}`, new Date());
        try {
          await job.handler();
          console.log(`Finished ${job.name}`, new Date());
        } catch (err) {
          console.error(`${job.name} failed:`, err);
        }
      });
      console.log(`Scheduled: ${job.name} (${job.schedule})`);
    }
  }
}

/**
 * Create a job that wraps database connection lifecycle
 * Uses generic type parameter to maintain type safety for the database instance
 */
export function createDatabaseJob<TDb>(
  name: string,
  schedule: string,
  createDb: () => DatabaseConnection<TDb>,
  handler: (db: TDb) => Promise<void>
): CronJob {
  return {
    name,
    schedule,
    handler: async () => {
      const { db, client } = createDb();
      try {
        await handler(db);
      } finally {
        client.close();
      }
    }
  };
}
