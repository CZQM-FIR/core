import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { news } from '@czqm/db/schema';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';

export const load = (async ({ params }) => {
  const articleID = params.articleID;

  const article = await db.query.news.findFirst({
    where: eq(news.id, Number(articleID)),
    with: {
      author: {
        columns: {
          cid: true,
          name_full: true
        }
      }
    }
  });

  if (!article) {
    redirect(303, '/news');
  }

  return {
    article
  };
}) satisfies PageServerLoad;
