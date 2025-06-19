import { db } from '$lib/db';
import { news } from '@czqm/db/schema';
import type { PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import { type } from 'arktype';

export const load = (async () => {
	const articles = await db.query.news.findMany({
		with: {
			author: true
		}
	});

	return { articles };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			id: type('string.integer >= 0').pipe((v) => Number(v))
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return { status: 400, body: { message: 'Invalid form data' } };
		}

		const { id } = data;

		if (!locals.user) return { status: 401, body: { message: 'Unauthorized' } };

		const actioner = await db.query.users.findFirst({
			where: (users, { eq }) => eq(users.cid, locals.user?.cid || 0),
			with: {
				flags: {
					with: {
						flag: true
					}
				}
			}
		});

		if (
			!actioner ||
			!actioner.flags.some(
				(f) =>
					f.flag.name === 'admin' ||
					f.flag.name === 'chief' ||
					f.flag.name === 'deputy' ||
					f.flag.name === 'chief-instructor' ||
					f.flag.name === 'events'
			)
		) {
			return { status: 401, body: { message: 'Unauthorized' } };
		}

		const article = await db.query.news.findFirst({
			where: (events, { eq }) => eq(news.id, id)
		});

		if (!article) {
			return { status: 404, body: { message: 'Article not found' } };
		}

		await db.delete(news).where(eq(news.id, id));

		return { status: 200 };
	}
};
