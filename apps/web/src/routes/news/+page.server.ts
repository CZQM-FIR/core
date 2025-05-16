import type { PageServerLoad } from './$types';
import { db } from '$lib/db';

export const load = (async ({}) => {
  const news = await db.query.news.findMany({
    with: {
      author: {
        columns: {
          cid: true,
          name_full: true
        }
      }
    }
  });

  return { news };
}) satisfies PageServerLoad;
