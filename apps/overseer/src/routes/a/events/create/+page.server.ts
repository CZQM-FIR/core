import { events, users } from '@czqm/db/schema';
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

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const start = data.get('start') as string;
		const end = data.get('end') as string;
		const description = data.get('description') as string;
		const image = data.get('image') as File;
		const timezone = data.get('timezone') as number;

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
			!actioner.flags.some(
				(f) =>
					f.flag.name === 'admin' ||
					f.flag.name === 'chief' ||
					f.flag.name === 'deputy' ||
					f.flag.name === 'chief-instructor' ||
					f.flag.name === 'events'
			)
		) {
			return fail(401);
		}

		const fileName = `event/${Date.now()}-${image.name}`;

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
					Body: Buffer.from(await image.arrayBuffer()),
					ContentType: image.type
				})
			);
		} catch (error) {
			console.error(error);
			return fail(500);
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
