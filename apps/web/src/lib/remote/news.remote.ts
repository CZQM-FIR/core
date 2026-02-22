import { query } from '$app/server';
import { db } from '$lib/db';
import { NewsArticle } from '@czqm/common';
import { error } from '@sveltejs/kit';
import { type } from 'arktype';

export const getNewsArticles = query(async () => {
  return await NewsArticle.fetchAllWithAuthor(db);
});

export const getNewsArticle = query(type('number.integer >= 0'), async (id) => {
  const article = await NewsArticle.fetchByIdWithAuthor(db, id);

  if (!article) {
    throw error(404, 'Article not found');
  }

  return article;
});
