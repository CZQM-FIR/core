import { db } from '$lib/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { news, users } from '@czqm/db/schema';
import { S3Client } from '@aws-sdk/client-s3';
import { CLOUDFLARE_ACCOUNT_ID } from '$env/static/private';
import { R2_ACCESS_KEY_ID } from '$env/static/private';
import { R2_ACCESS_KEY } from '$env/static/private';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { R2_BUCKET_NAME } from '$env/static/private';

export const load = (async ({ params }) => {
	const article = await db.query.news.findFirst({
		where: (news, { eq }) => eq(news.id, Number(params.id))
	});

	if (!article) {
		redirect(303, '/a/news');
	}

	return { article };
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const title = data.get('title') as string;
		const text = data.get('text') as string;
		const image = data.get('image') as File;

		if (!locals.user) return fail(401);

		const actioner = await db.query.users.findFirst({
			where: eq(users.cid, locals.user.cid),
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
			!actioner.flags.some((f) => f.flag.name === 'admin' || f.flag.name === 'staff')
		) {
			return fail(401, { message: 'Unauthorized' });
		}

		const article = await db.query.news.findFirst({
			where: eq(news.id, Number(data.get('id')))
		});

		if (!article) {
			return fail(404, { message: 'Article not found' });
		}

		const fileName = image.name ? `news/${Date.now()}-${image.name}` : article.image;

		if (image.name && fileName) {
			const s3 = new S3Client({
				region: 'auto',
				endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
				credentials: {
					accessKeyId: R2_ACCESS_KEY_ID,
					secretAccessKey: R2_ACCESS_KEY
				}
			});

			try {
				await s3.send(
					new PutObjectCommand({
						Bucket: R2_BUCKET_NAME,
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
			.where(eq(news.id, Number(data.get('id'))));

		return { status: 200, message: 'Article updated successfully' };
	}
};
