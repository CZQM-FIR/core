import type { DB, Env } from '@czqm/common';
import { Course } from '@czqm/common';

export const syncCourseTaskCompletions = async (db: DB, env: Pick<Env, 'VATCAN_API_TOKEN'>) => {
  const enrolled = await db.query.enrolledUsers.findMany({
    where: {
      hiddenAt: { isNull: true },
      pausedAt: { isNull: true }
    },
    with: {
      waitlist: true
    }
  });

  console.log(`Starting course task completions sync for ${enrolled.length} enrolled students`);

  const courseByWaitlistId = new Map<number, Awaited<ReturnType<typeof Course.fetchByWaitlistId>>>();
  let processed = 0;

  for (const row of enrolled) {
    let course = courseByWaitlistId.get(row.waitlistId);
    if (course === undefined) {
      course = await Course.fetchByWaitlistId(row.waitlistId, db);
      courseByWaitlistId.set(row.waitlistId, course);
    }
    if (!course) continue;

    try {
      await course.syncTaskCompletions(row.cid, env);
      processed++;
    } catch (err) {
      console.error(
        `Failed to sync task completions for user ${row.cid} on waitlist ${row.waitlistId}:`,
        err
      );
    }
  }

  console.log(
    `Finished course task completions sync: processed ${processed}/${enrolled.length} students`
  );
};
