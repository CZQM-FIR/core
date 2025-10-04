import { events, users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { fail } from '@sveltejs/kit';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import env from '$lib/env';
import { type } from 'arktype';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const FormData = type({
			name: 'string',
			start: 'string.date',
			end: 'string.date',
			description: 'string',
			image: 'File'
		});

		const data = FormData(Object.fromEntries((await request.formData()).entries()));

		if (data instanceof type.errors) {
			return fail(400, { status: 400, message: 'Invalid form data' });
		}

		const { name, start, end, description, image } = data;

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
			!actioner.flags.some(
				(f) =>
					f.flag.name === 'admin' ||
					f.flag.name === 'chief' ||
					f.flag.name === 'deputy' ||
					f.flag.name === 'chief-instructor' ||
					f.flag.name === 'events'
			)
		) {
			return fail(401, { status: 401, message: 'Unauthorized' });
		}

		const fileName = `event/${Date.now()}-${image.name}`;

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
			return fail(500, { status: 500, message: 'Failed to upload image to R2' + error });
		}

		await db.insert(events).values({
			name,
			start: new Date(start),
			end: new Date(end),
			description,
			image: fileName
		});

		return { status: 200 };
	}
};
