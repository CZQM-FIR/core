import { news, users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	CLOUDFLARE_ACCOUNT_ID,
	R2_ACCESS_KEY,
	R2_ACCESS_KEY_ID,
	R2_BUCKET_NAME
} from '$env/static/private';
import { type } from 'arktype';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			title: 'string',
			text: 'string',
			image: 'File | null',
			anonymous: type("'on' | 'off'").pipe((v) => v === 'on')
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));
		if (data instanceof type.errors) {
			return fail(400, { status: 400, message: 'Invalid form data' });
		}
		const { title, text, image, anonymous } = data;

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
			return fail(401);
		}

		const fileName: string | null = image?.name ? `news/${Date.now()}-${image?.name}` : null;

		if (fileName && image) {
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
				return fail(500);
			}
		}

		await db.insert(news).values({
			title,
			date: new Date(Date.now()),
			text,
			image: fileName,
			authorID: anonymous ? null : actioner.cid
		});

		return { status: 200 };
	}
};
