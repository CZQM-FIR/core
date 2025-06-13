import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/db';
import { users } from '@czqm/db/schema';
import { eq } from 'drizzle-orm';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
	CLOUDFLARE_ACCOUNT_ID,
	R2_ACCESS_KEY,
	R2_ACCESS_KEY_ID,
	R2_BUCKET_NAME
} from '$env/static/private';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const file = data.get('file') as File;
		if (!file) {
			return fail(400, { success: false, error: 'No file uploaded.' });
		}

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

		const fileName: string | null = file?.name ? `upload/${Date.now()}-${file?.name}` : null;

		if (fileName && file) {
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
						Body: Buffer.from(await file.arrayBuffer()),
						ContentType: file.type
					})
				);
			} catch (error) {
				console.error(error);
				return fail(500, { success: false, error: 'Failed to upload file to R2.' + error });
			}
		}

		return { success: true, key: fileName };
	}
};
