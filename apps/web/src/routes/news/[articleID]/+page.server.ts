import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';

export const load = (async ({ params }) => {
  const articleID = params.articleID;

  const article = await db.query.news.findFirst({
    where: { id: Number(articleID) },
    with: {
      author: {
        columns: {
          cid: true,
          name_full: true,
          name_first: true,
          name_last: true
        },
        with: {
          preferences: true
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
