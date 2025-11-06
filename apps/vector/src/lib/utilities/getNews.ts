import { news } from '@czqm/db/schema';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/db';

export const getAllArticles = async () => {
	const articles = db.query.news.findMany({
		orderBy: [desc(news.date)],
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
		where: eq(news.id, id),
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
