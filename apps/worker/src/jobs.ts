import { DB } from '@czqm/common';
import { activityReminder } from './activity';

export const executeJobs = async (db: DB) => {
  const executedJobs = await db.query.jobs.findMany({
    where: {
      executedTime: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      }
    }
  });

  await Promise.all([activityReminder(db, executedJobs)]);

  console.log('Finished executing long running jobs');
};
