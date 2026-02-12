import { db } from '$lib/db';

export const getAllArticles = async () => {
  const articles = db.query.news.findMany({
    orderBy: { date: 'desc' },
    with: {
      author: {
        columns: {
          email: false
        }
      }
    }
  });

  return articles;
};

export const getArticleById = async (id: number) => {
  const article = db.query.news.findFirst({
    where: { id },
    with: {
      author: {
        columns: {
          email: false
        }
      }
    }
  });

  return article;
};
