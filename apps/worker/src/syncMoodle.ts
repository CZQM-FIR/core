import { XMLParser } from 'fast-xml-parser';
import type { DB, Env } from '@czqm/common';
import { moodleQueue } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ''
});

const getMoodleUserId = async (cid: number, env: Env): Promise<number> => {
  const res = await fetch(
    `${env.MOODLE_URL}/webservice/rest/server.php?wstoken=${env.MOODLE_TOKEN}&wsfunction=core_user_get_users&criteria[0][key]=username&criteria[0][value]=${cid}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const xmlText = await res.text();

  const result = parser.parse(xmlText);

  return result.RESPONSE.SINGLE.KEY.find(
    (k: { name: string }) => k.name === 'users'
  ).MULTIPLE.SINGLE?.KEY?.find((k: { name: string }) => k.name === 'id')?.VALUE;
};

const getMoodleCohortId = async (cohortId: string, env: Env): Promise<number> => {
  const res = await fetch(
    `${env.MOODLE_URL}/webservice/rest/server.php?wstoken=${env.MOODLE_TOKEN}&wsfunction=core_cohort_search_cohorts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `query=${cohortId}&limitnum=1&context[contextlevel]=10&context[instanceid]=0`
    }
  );
  const xmlText = await res.text();
  const result = parser.parse(xmlText);
  return result.RESPONSE.SINGLE.KEY.MULTIPLE.SINGLE.KEY.find(
    (k: { name: string }) => k.name === 'id'
  )?.VALUE;
};

export const syncMoodle = async (db: DB, env: Env) => {
  const token = env.MOODLE_TOKEN;

  const queue = await db.query.moodleQueue.findMany({
    orderBy: (moodleQueue) => [moodleQueue.timestamp],
    with: {
      user: true
    }
  });

  for (const entry of queue) {
    if (entry.add) {
      // does user exist?
      if (!(await getMoodleUserId(entry.cid, env))) {
        console.log(`User with cid ${entry.cid} not found in Moodle.`);
        continue;
      }

      // add user to cohort
      const res = await fetch(
        `${env.MOODLE_URL}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_cohort_add_cohort_members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `members[0][cohorttype][type]=idnumber&members[0][cohorttype][value]=${entry.cohortId}&members[0][usertype][type]=username&members[0][usertype][value]=${entry.cid}`
        }
      );

      if (res.ok) {
        await db.delete(moodleQueue).where(eq(moodleQueue.id, entry.id));
      }
    } else {
      // does user exist?
      const moodleUserId = await getMoodleUserId(entry.cid, env);
      if (!moodleUserId) {
        console.log(`User with cid ${entry.cid} not found in Moodle.`);
        continue;
      }

      // remove user from cohort
      const res = await fetch(
        `${env.MOODLE_URL}/webservice/rest/server.php?wstoken=${token}&wsfunction=core_cohort_delete_cohort_members`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `members[0][cohortid]=${await getMoodleCohortId(entry.cohortId, env)}&members[0][userid]=${moodleUserId}`
        }
      );

      console.log(await res.text());

      if (res.ok) {
        await db.delete(moodleQueue).where(eq(moodleQueue.id, entry.id));
      }
    }
  }
};
