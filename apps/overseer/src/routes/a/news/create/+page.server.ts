import { news, users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type } from 'arktype';
import env from '$lib/env';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		// Parse form data with proper error handling
		let formData;
		try {
			formData = await request.formData();
		} catch (error) {
			// Handle body size limit exceeded (413 Payload Too Large)
			if (error instanceof Error && error.message.includes('exceeds limit')) {
				return fail(413, {
					status: 413,
					message: 'Image file is too large. Maximum file size is 10MB.'
				});
			}
			console.error('Form data parsing error:', error);
			return fail(400, {
				status: 400,
				message: 'Failed to process form data. Please try again.'
			});
		}

		const FormData = type({
			title: 'string',
			text: 'string',
			image: 'File | null',
			'anonymous?': type("'on' | 'off'").pipe((v) => v === 'on')
		});
		const data = FormData(Object.fromEntries(formData.entries()));
		if (data instanceof type.errors) {
			console.error(data.summary);
			return fail(400, { status: 400, message: 'Invalid form data. Please check all fields.' });
		}
		const { title, text, image, anonymous = false } = data;

		// Validate image file if provided
		if (image) {
			if (image.size > 10 * 1024 * 1024) {
				return fail(413, {
					status: 413,
					message: 'Image file is too large. Maximum file size is 10MB.'
				});
			}

			if (!image.type.startsWith('image/')) {
				return fail(400, {
					status: 400,
					message: 'Invalid file type. Please upload an image file.'
				});
			}
		}

		if (!locals.user) return fail(401, { status: 401, message: 'Unauthorized' });

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
			return fail(401, { status: 401, message: 'Unauthorized' });
		}

		const fileName: string | null = image?.name ? `news/${Date.now()}-${image?.name}` : null;

		if (fileName && image) {
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
				console.error('R2 upload error:', error);
				return fail(500, {
					status: 500,
					message:
						'Failed to upload image. Please try again or contact support if the issue persists.'
				});
			}
		}

		try {
			await db.insert(news).values({
				title,
				date: new Date(Date.now()),
				text,
				image: fileName,
				authorID: anonymous ? null : actioner.cid
			});
		} catch (error) {
			console.error('Database insert error:', error);
			return fail(500, {
				status: 500,
				message: 'Failed to create news article. Please try again.'
			});
		}

		return { status: 200 };
	}
};
