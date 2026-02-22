import * as schema from '@czqm/db/schema';
import type { DB } from '@czqm/common';
import { eq } from 'drizzle-orm';

export const fixWaitlistsJob = async (db: DB) => {
  const waitlists = await db.query.waitlists.findMany({
    with: {
      students: true
    }
  });

  for (const waitlist of waitlists.filter((wl) => wl.students.length > 0)) {
    const students = [...waitlist.students].sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.waitingSince.getTime() - b.waitingSince.getTime();
    });

    const data = students.map((student, index) => {
      return {
        id: student.id,
        position: index
      };
    });

    for (const studentData of data) {
      await db
        .update(schema.waitingUsers)
        .set({ position: studentData.position })
        .where(eq(schema.waitingUsers.id, studentData.id));
    }
  }
};
