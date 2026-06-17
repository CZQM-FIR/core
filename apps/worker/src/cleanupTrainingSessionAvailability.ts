import { trainingSessionAvailability } from '@czqm/db/schema';
import type { DB } from '@czqm/common';
import { lt } from 'drizzle-orm';

export const cleanupTrainingSessionAvailability = async (db: DB) => {
  console.log('Starting cleanup of passed training session availability', new Date());

  const result = await db
    .delete(trainingSessionAvailability)
    .where(lt(trainingSessionAvailability.endsAt, new Date()));

  console.log(
    `Finished cleanup of passed training session availability, deleted ${result.rowsAffected} rows`,
    new Date()
  );
};
