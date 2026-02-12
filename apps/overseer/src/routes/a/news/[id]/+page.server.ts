import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { news } from '@czqm/db/schema';
import { S3Client } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { type } from 'arktype';
import env from '$lib/env';
import { eq } from 'drizzle-orm';

export const load = (async ({ params }) => {
	const article = await db.query.news.findFirst({
		where: { id: Number(params.id) }
	});

	if (!article) {
		redirect(303, '/a/news');
	}

	return { article };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			id: type('string.integer >= 0').pipe((v) => Number(v)),
			title: 'string',
			text: 'string',
			image: 'File'
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400, { message: 'Invalid form data' });
		}

		const { id, title, text, image } = data;

		if (!locals.user) return fail(401);

		const actioner = await db.query.users.findFirst({
			where: { cid: locals.user!.cid },
			with: {
				flags: true
			}
		});

		if (!actioner || !actioner.flags.some((f) => f.name === 'admin' || f.name === 'staff')) {
			return fail(401, { message: 'Unauthorized' });
		}

		const article = await db.query.news.findFirst({
			where: { id }
		});

		if (!article) {
			return fail(404, { message: 'Article not found' });
		}

		const fileName = image.name ? `news/${Date.now()}-${image.name}` : article.image;

		if (image.name && fileName) {
			const s3 = new S3Client({
				region: 'auto',
				endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				credentials: {
					accessKeyId: env.R2_ACCESS_KEY_ID,
					secretAccessKey: env.R2_ACCESS_KEY
				}
			});

			try {
				await s3.send(
					new PutObjectCommand({
						Bucket: env.R2_BUCKET_NAME,
						Key: fileName,
						Body: new Uint8Array(await image.arrayBuffer()),
						ContentType: image.type
					})
				);
			} catch (error) {
				console.error(error);
				return fail(500, { message: 'Failed to upload image' });
			}
		}

		await db
			.update(news)
			.set({
				title,
				text,
				image: image ? fileName : article.image
			})
			.where(eq(news.id, id));

		return { status: 200, message: 'Article updated successfully' };
	}
};
