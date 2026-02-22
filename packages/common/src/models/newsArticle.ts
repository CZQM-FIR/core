import { news } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { DB } from '../db';
import { User } from './user';

type CreateNewsArticleInput = {
  title: string;
  text: string;
  image: string | null;
  authorID: number | null;
  date?: Date;
};

type UpdateNewsArticleInput = {
  title: string;
  text: string;
  image: string | null;
};

export class NewsArticle {
  static async fetchAll(db: DB) {
    return await db.query.news.findMany({
      orderBy: (news, { desc }) => [desc(news.date)]
    });
  }

  static async fetchById(db: DB, id: number) {
    return await db.query.news.findFirst({
      where: { id }
    });
  }

  static async fetchAllWithAuthor(db: DB) {
    const articles = await NewsArticle.fetchAll(db);

    return await Promise.all(
      articles.map(async (article) => ({
        ...article,
        author: article.authorID ? await User.fromCid(db, article.authorID) : null
      }))
    );
  }

  static async fetchByIdWithAuthor(db: DB, id: number) {
    const article = await NewsArticle.fetchById(db, id);

    if (!article) {
      return null;
    }

    return {
      ...article,
      author: article.authorID ? await User.fromCid(db, article.authorID) : null
    };
  }

  static async create(db: DB, data: CreateNewsArticleInput) {
    return await db.insert(news).values({
      title: data.title,
      text: data.text,
      image: data.image,
      authorID: data.authorID,
      date: data.date ?? new Date()
    });
  }

  static async update(db: DB, id: number, data: UpdateNewsArticleInput) {
    return await db
      .update(news)
      .set({
        title: data.title,
        text: data.text,
        image: data.image
      })
      .where(eq(news.id, id));
  }

  static async remove(db: DB, id: number) {
    return await db.delete(news).where(eq(news.id, id));
  }
}
